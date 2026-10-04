
import ollama from "ollama";
import readline from "readline";
import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";

/* =========================================================
   CONFIG
========================================================= */

const MODEL = "qwen2.5-coder:3b";

const PROJECT_DIR = process.cwd();

const SANDBOX_DIR = path.join(
  PROJECT_DIR,
  "sandbox"
);

/* =========================================================
   READLINE
========================================================= */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true,
});

/*
  Prevent multiple commands from running at the
  same time.
*/
let busy = false;

/* =========================================================
   CONVERSATION MEMORY
========================================================= */

const messages = [
  {
    role: "system",
    content:
      "You are Zini, a local coding assistant. Help with programming, debugging, learning and code analysis. Be concise and accurate.",
  },
];

/* =========================================================
   UTILITY
========================================================= */

function getFilePath(fileName) {
  return path.resolve(
    PROJECT_DIR,
    fileName
  );
}

function getSandboxPath(fileName) {
  return path.join(
    SANDBOX_DIR,
    path.basename(fileName)
  );
}

/* =========================================================
   READ FILE
========================================================= */

async function readFile(fileName) {
  try {
    const filePath = getFilePath(fileName);

    const content = await fs.readFile(
      filePath,
      "utf8"
    );

    return content;
  } catch (error) {
    return `ERROR: ${error.message}`;
  }
}

/* =========================================================
   CLEAN AI RESPONSE
========================================================= */

function cleanAIResponse(response) {
  let code = String(response || "").trim();

  /*
    Remove markdown fences if model ignores
    our instructions.
  */

  code = code.replace(
    /^```(?:javascript|js|node)?\s*/i,
    ""
  );

  code = code.replace(
    /\s*```$/i,
    ""
  );

  return code.trim();
}

/* =========================================================
   CHECK IF AI RESPONSE LOOKS LIKE CODE
========================================================= */

function looksLikeJavaScript(code) {
  if (!code || !code.trim()) {
    return false;
  }

  const text = code.trim();

  /*
    Obvious conversational garbage.
  */

  const badPatterns = [
    "risk assessment",
    "training and awareness",
    "regular reviews",
    "standard operating procedures",
    "feedback mechanism",
    "regular audits",
    "incident response plan",
    "error-resilient processes",
    "here is the corrected code",
    "here's the corrected code",
    "here is the solution",
    "here's the solution",
    "explanation:",
    "###",
  ];

  const lower = text.toLowerCase();

  for (const pattern of badPatterns) {
    if (lower.includes(pattern)) {
      return false;
    }
  }

  /*
    A JavaScript file normally contains at least
    one recognizable JS construct.

    This is not a complete JS parser.
    The real syntax validation happens later.
  */

  const jsPatterns = [
    /\b(const|let|var)\b/,
    /\b(function)\b/,
    /=>/,
    /\b(if|else|for|while|switch)\b/,
    /\b(console\.(log|error|warn))\b/,
    /\b(import|export)\b/,
    /\brequire\s*\(/,
    /\bclass\s+\w+/,
    /\breturn\b/,
  ];

  return jsPatterns.some((pattern) =>
    pattern.test(text)
  );
}

/* =========================================================
   JAVASCRIPT SYNTAX VALIDATION
========================================================= */

async function validateJavaScript(code) {
  const tempFile = path.join(
    SANDBOX_DIR,
    "__zini_validation__.js"
  );

  try {
    await fs.mkdir(
      SANDBOX_DIR,
      {
        recursive: true,
      }
    );

    await fs.writeFile(
      tempFile,
      code,
      "utf8"
    );

    return await new Promise((resolve) => {
      const child = spawn(
        process.execPath,
        ["--check", tempFile],
        {
          cwd: PROJECT_DIR,
          stdio: [
            "ignore",
            "pipe",
            "pipe",
          ],
        }
      );

      let stdout = "";
      let stderr = "";

      child.stdout.on(
        "data",
        (data) => {
          stdout += data.toString();
        }
      );

      child.stderr.on(
        "data",
        (data) => {
          stderr += data.toString();
        }
      );

      child.on(
        "error",
        (error) => {
          resolve({
            valid: false,
            error: error.message,
          });
        }
      );

      child.on(
        "close",
        (exitCode) => {
          resolve({
            valid: exitCode === 0,
            error:
              stderr.trim() ||
              stdout.trim(),
          });
        }
      );
    });
  } catch (error) {
    return {
      valid: false,
      error: error.message,
    };
  } finally {
    await fs.rm(
      tempFile,
      {
        force: true,
      }
    );
  }
}

/* =========================================================
   ANALYSE FILE
========================================================= */

async function analyseFile(fileName) {
  const code = await readFile(
    fileName
  );

  if (code.startsWith("ERROR:")) {
    console.log(
      `\nZini: ${code}\n`
    );

    return;
  }

  const prompt = `
Analyze this JavaScript file.

FILE:
${fileName}

CODE:
${code}

Find:
- syntax errors
- runtime errors
- undefined variables
- logical bugs
- obvious mistakes

For every problem:
1. Explain the problem.
2. Explain why it happens.
3. Suggest the fix.

Do not modify the file.
Do not return code unless necessary for explaining a fix.
`;

  try {
    const response =
      await ollama.chat({
        model: MODEL,

        messages: [
          {
            role: "system",
            content:
              "You are a JavaScript code reviewer. Analyze only the supplied code.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],

        stream: true,
      });

    process.stdout.write(
      "\nZini: "
    );

    let fullResponse = "";

    for await (
      const part of response
    ) {
      const text =
        part.message?.content || "";

      process.stdout.write(text);

      fullResponse += text;
    }

    process.stdout.write(
      "\n\n"
    );

    messages.push({
      role: "user",
      content: prompt,
    });

    messages.push({
      role: "assistant",
      content: fullResponse,
    });
  } catch (error) {
    console.log(
      `\nZini Error: ${error.message}\n`
    );
  }
}

/* =========================================================
   EXPLAIN FILE
========================================================= */

async function explainFile(fileName) {
  const code = await readFile(
    fileName
  );

  if (code.startsWith("ERROR:")) {
    console.log(
      `\nZini: ${code}\n`
    );

    return;
  }

  const prompt = `
Explain this JavaScript file to a beginner.

FILE:
${fileName}

CODE:
${code}

Explain:
1. What the code does.
2. Important variables.
3. Important functions.
4. How the program works.
5. Important JavaScript concepts.

Keep the explanation simple.
`;

  try {
    const response =
      await ollama.chat({
        model: MODEL,

        messages: [
          {
            role: "system",
            content:
              "You are a beginner-friendly JavaScript teacher.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],

        stream: true,
      });

    process.stdout.write(
      "\nZini: "
    );

    let fullResponse = "";

    for await (
      const part of response
    ) {
      const text =
        part.message?.content || "";

      process.stdout.write(text);

      fullResponse += text;
    }

    process.stdout.write(
      "\n\n"
    );

    messages.push({
      role: "user",
      content: prompt,
    });

    messages.push({
      role: "assistant",
      content: fullResponse,
    });
  } catch (error) {
    console.log(
      `\nZini Error: ${error.message}\n`
    );
  }
}

/* =========================================================
   GENERATE FIX
========================================================= */

async function generateFix(
  fileName
) {
  const originalCode =
    await readFile(fileName);

  if (
    originalCode.startsWith(
      "ERROR:"
    )
  ) {
    console.log(
      `\nZini: ${originalCode}\n`
    );

    return null;
  }

  const prompt = `
You are a JavaScript code repair engine.

TASK:
Fix actual bugs in the JavaScript source code below.

FILE:
${fileName}

SOURCE CODE:
${originalCode}

STRICT OUTPUT RULES:

1. Return ONLY the complete JavaScript source code.
2. Do NOT explain anything.
3. Do NOT write a summary.
4. Do NOT discuss the workflow.
5. Do NOT discuss risk assessment.
6. Do NOT discuss training.
7. Do NOT discuss SOPs.
8. Do NOT use markdown.
9. Do NOT use code fences.
10. Do NOT write "Here is the corrected code".
11. Do NOT talk to the user.
12. Do NOT change unrelated functionality.
13. Preserve working code.
14. Return code that can be executed directly by Node.js.

IMPORTANT:
If you cannot confidently fix the code,
return the original source code unchanged.

OUTPUT:
ONLY JAVASCRIPT SOURCE CODE.
`;

  try {
    console.log(
      "\nZini: Generating code fix...\n"
    );

    const response =
      await ollama.generate({
        model: MODEL,

        prompt,

        stream: false,

        options: {
          temperature: 0.1,
          top_p: 0.9,
        },
      });

    let code =
      cleanAIResponse(
        response.response
      );

    if (!code) {
      console.log(
        "❌ Zini: AI returned empty output."
      );

      return null;
    }

    /*
      Reject obvious natural-language
      responses.
    */

    if (
      !looksLikeJavaScript(code)
    ) {
      console.log(
        "❌ Zini: AI returned text instead of JavaScript."
      );

      console.log(
        "Zini: Sandbox was NOT modified.\n"
      );

      return null;
    }

    /*
      Syntax validation BEFORE
      sandbox edit.
    */

    const validation =
      await validateJavaScript(
        code
      );

    if (!validation.valid) {
      console.log(
        "❌ Zini: AI generated invalid JavaScript."
      );

      if (validation.error) {
        console.log(
          "\nSyntax error:"
        );

        console.log(
          validation.error
        );
      }

      console.log(
        "\nZini: Sandbox was NOT modified.\n"
      );

      return null;
    }

    console.log(
      "✅ AI output passed JavaScript syntax check."
    );

    return code;
  } catch (error) {
    console.log(
      `\nZini Error: ${error.message}\n`
    );

    return null;
  }
}

/* =========================================================
   CREATE SANDBOX
========================================================= */

async function createSandbox(
  fileName
) {
  try {
    const originalPath =
      getFilePath(fileName);

    await fs.access(
      originalPath
    );

    await fs.mkdir(
      SANDBOX_DIR,
      {
        recursive: true,
      }
    );

    const sandboxPath =
      getSandboxPath(fileName);

    await fs.copyFile(
      originalPath,
      sandboxPath
    );

    return sandboxPath;
  } catch (error) {
    console.log(
      `\nZini Sandbox Error: ${error.message}\n`
    );

    return null;
  }
}

/* =========================================================
   EDIT SANDBOX
========================================================= */

async function editSandbox(
  fileName
) {
  const sandboxPath =
    await createSandbox(
      fileName
    );

  if (!sandboxPath) {
    return false;
  }

  const newCode =
    await generateFix(
      fileName
    );

  if (!newCode) {
    console.log(
      "Zini: No valid fix generated."
    );

    console.log(
      "Zini: Original file was NOT changed."
    );

    console.log(
      "Zini: Sandbox was NOT updated.\n"
    );

    return false;
  }

  try {
    await fs.writeFile(
      sandboxPath,
      newCode,
      "utf8"
    );

    console.log(
      "\n✅ Sandbox edit created."
    );

    console.log(
      `Original: ${fileName}`
    );

    console.log(
      `Sandbox : sandbox/${path.basename(
        fileName
      )}`
    );

    console.log(
      "\n🔒 Original file is still untouched.\n"
    );

    return true;
  } catch (error) {
    console.log(
      `\nZini Edit Error: ${error.message}\n`
    );

    return false;
  }
}

/* =========================================================
   TEST SANDBOX
========================================================= */

async function testSandbox(
  fileName
) {
  const fileBaseName =
    path.basename(fileName);

  if (
    !fileBaseName.endsWith(
      ".js"
    )
  ) {
    console.log(
      "\nZini: Currently only .js files are supported.\n"
    );

    return false;
  }

  const sandboxPath =
    getSandboxPath(
      fileName
    );

  try {
    await fs.access(
      sandboxPath
    );
  } catch {
    console.log(
      `\nZini: sandbox/${fileBaseName} does not exist.`
    );

    console.log(
      `Zini: Run "edit ${fileName}" first.\n`
    );

    return false;
  }

  /*
    First syntax check.
  */

  const validation =
    await validateJavaScriptFile(
      sandboxPath
    );

  if (!validation.valid) {
    console.log(
      "\n❌ SANDBOX SYNTAX CHECK FAILED."
    );

    if (validation.error) {
      console.log(
        "\nError:"
      );

      console.log(
        validation.error
      );
    }

    console.log(
      "\nZini: Original file was NOT changed.\n"
    );

    return false;
  }

  console.log(
    `\nZini: Testing sandbox/${fileBaseName}...\n`
  );

  return new Promise(
    (resolve) => {
      const child =
        spawn(
          process.execPath,
          [sandboxPath],
          {
            cwd:
              SANDBOX_DIR,

            stdio: [
              "ignore",
              "pipe",
              "pipe",
            ],

            /*
              Prevent a simple infinite
              loop from running forever.
            */
            timeout: 10000,
          }
        );

      let output = "";
      let errorOutput = "";

      child.stdout.on(
        "data",
        (data) => {
          output +=
            data.toString();
        }
      );

      child.stderr.on(
        "data",
        (data) => {
          errorOutput +=
            data.toString();
        }
      );

      child.on(
        "error",
        (error) => {
          console.log(
            `\nZini Test Error: ${error.message}\n`
          );

          resolve(false);
        }
      );

      child.on(
        "close",
        (code) => {
          if (
            code === 0
          ) {
            console.log(
              "✅ TEST PASSED\n"
            );

            if (
              output.trim()
            ) {
              console.log(
                "Output:"
              );

              console.log(
                output
              );
            }

            console.log();

            resolve(true);

            return;
          }

          console.log(
            "❌ TEST FAILED\n"
          );

          if (
            errorOutput.trim()
          ) {
            console.log(
              "Error:"
            );

            console.log(
              errorOutput
            );
          }

          if (
            output.trim()
          ) {
            console.log(
              "\nOutput:"
            );

            console.log(
              output
            );
          }

          console.log();

          resolve(false);
        }
      );
    }
  );
}

/* =========================================================
   VALIDATE EXISTING JS FILE
========================================================= */

async function validateJavaScriptFile(
  filePath
) {
  return new Promise(
    (resolve) => {
      const child =
        spawn(
          process.execPath,
          [
            "--check",
            filePath,
          ],
          {
            cwd:
              PROJECT_DIR,

            stdio: [
              "ignore",
              "pipe",
              "pipe",
            ],
          }
        );

      let stdout = "";
      let stderr = "";

      child.stdout.on(
        "data",
        (data) => {
          stdout +=
            data.toString();
        }
      );

      child.stderr.on(
        "data",
        (data) => {
          stderr +=
            data.toString();
        }
      );

      child.on(
        "error",
        (error) => {
          resolve({
            valid: false,
            error:
              error.message,
          });
        }
      );

      child.on(
        "close",
        (exitCode) => {
          resolve({
            valid:
              exitCode === 0,

            error:
              stderr.trim() ||
              stdout.trim(),
          });
        }
      );
    }
  );
}

/* =========================================================
   DIFF
========================================================= */

async function showDiff(
  fileName
) {
  const originalPath =
    getFilePath(fileName);

  const sandboxPath =
    getSandboxPath(fileName);

  try {
    const original =
      await fs.readFile(
        originalPath,
        "utf8"
      );

    const sandbox =
      await fs.readFile(
        sandboxPath,
        "utf8"
      );

    const oldLines =
      original.split("\n");

    const newLines =
      sandbox.split("\n");

    console.log(
      "\n========== DIFF ==========\n"
    );

    let changed = false;

    const maxLines =
      Math.max(
        oldLines.length,
        newLines.length
      );

    for (
      let i = 0;
      i < maxLines;
      i++
    ) {
      const oldLine =
        oldLines[i];

      const newLine =
        newLines[i];

      if (
        oldLine ===
        newLine
      ) {
        console.log(
          `  ${oldLine ?? ""}`
        );
      } else {
        changed = true;

        if (
          oldLine !==
          undefined
        ) {
          console.log(
            `- ${oldLine}`
          );
        }

        if (
          newLine !==
          undefined
        ) {
          console.log(
            `+ ${newLine}`
          );
        }
      }
    }

    console.log(
      "\n=========================="
    );

    if (!changed) {
      console.log(
        "\nNo changes detected.\n"
      );

      return false;
    }

    console.log(
      "\nChanges detected.\n"
    );

    return true;
  } catch (error) {
    console.log(
      `\nZini Diff Error: ${error.message}\n`
    );

    return false;
  }
}

/* =========================================================
   APPROVAL
========================================================= */

function askApproval() {
  return new Promise(
    (resolve) => {
      rl.question(
        "\nZini: Apply these changes to the original file? (y/n): ",
        (answer) => {
          const choice =
            answer
              .trim()
              .toLowerCase();

          resolve(
            choice === "y" ||
              choice === "yes"
          );
        }
      );
    }
  );
}

/* =========================================================
   APPLY
========================================================= */

async function applyChanges(
  fileName
) {
  const originalPath =
    getFilePath(fileName);

  const sandboxPath =
    getSandboxPath(fileName);

  try {
    /*
      Final validation immediately
      before applying.
    */

    const validation =
      await validateJavaScriptFile(
        sandboxPath
      );

    if (!validation.valid) {
      console.log(
        "\n❌ Final validation failed."
      );

      console.log(
        "Zini: Changes were NOT applied.\n"
      );

      return false;
    }

    /*
      Backup original first.
    */

    const backupPath =
      `${originalPath}.zini-backup`;

    await fs.copyFile(
      originalPath,
      backupPath
    );

    /*
      Apply sandbox version.
    */

    await fs.copyFile(
      sandboxPath,
      originalPath
    );

    console.log(
      `\n✅ Changes applied to ${fileName}`
    );

    console.log(
      `🛡 Backup created: ${path.basename(
        backupPath
      )}`
    );

    console.log(
      "\nZini: Original file has been updated.\n"
    );

    return true;
  } catch (error) {
    console.log(
      `\n❌ Apply failed: ${error.message}\n`
    );

    return false;
  }
}

/* =========================================================
   COMPLETE SAFE WORKFLOW
========================================================= */

async function fullFixFlow(
  fileName
) {
  console.log(
    `\nZini: Starting safe fix workflow for ${fileName}...\n`
  );

  /*
    STEP 1
    READ
  */

  const original =
    await readFile(
      fileName
    );

  if (
    original.startsWith(
      "ERROR:"
    )
  ) {
    console.log(
      `Zini: ${original}\n`
    );

    return;
  }

  console.log(
    "1️⃣ READ       ✅"
  );

  /*
    STEP 2
    SANDBOX EDIT
  */

  const edited =
    await editSandbox(
      fileName
    );

  if (!edited) {
    console.log(
      "\n❌ Workflow stopped."
    );

    console.log(
      "🔒 Original file is safe.\n"
    );

    return;
  }

  console.log(
    "2️⃣ SANDBOX    ✅"
  );

  /*
    STEP 3
    TEST
  */

  const passed =
    await testSandbox(
      fileName
    );

  if (!passed) {
    console.log(
      "❌ Workflow stopped."
    );

    console.log(
      "🔒 Original file was NOT changed.\n"
    );

    return;
  }

  console.log(
    "3️⃣ TEST       ✅"
  );

  /*
    STEP 4
    DIFF
  */

  const changed =
    await showDiff(
      fileName
    );

  if (!changed) {
    console.log(
      "Zini: No changes detected."
    );

    console.log(
      "Original file remains unchanged.\n"
    );

    return;
  }

  console.log(
    "4️⃣ DIFF       ✅"
  );

  /*
    STEP 5
    APPROVAL
  */

  console.log(
    "\n⚠️ IMPORTANT"
  );

  console.log(
    "The original file is STILL unchanged."
  );

  console.log(
    "Review the diff above before approving.\n"
  );

  const approved =
    await askApproval();

  if (!approved) {
    console.log(
      "\n❌ CANCELLED"
    );

    console.log(
      "🔒 Original file was NOT changed.\n"
    );

    return;
  }

  console.log(
    "\n5️⃣ APPROVE    ✅"
  );

  /*
    STEP 6
    APPLY
  */

  const applied =
    await applyChanges(
      fileName
    );

  if (applied) {
    console.log(
      "6️⃣ APPLY      ✅"
    );

    console.log(
      "\n🎉 Safe fix workflow completed.\n"
    );
  }
}

/* =========================================================
   NORMAL CHAT
========================================================= */

async function normalChat(
  userInput
) {
  messages.push({
    role: "user",
    content: userInput,
  });

  try {
    const response =
      await ollama.chat({
        model: MODEL,
        messages,
        stream: true,
      });

    process.stdout.write(
      "\nZini: "
    );

    let fullResponse = "";

    for await (
      const part of response
    ) {
      const text =
        part.message?.content ||
        "";

      process.stdout.write(
        text
      );

      fullResponse += text;
    }

    process.stdout.write(
      "\n\n"
    );

    messages.push({
      role: "assistant",
      content: fullResponse,
    });
  } catch (error) {
    console.log(
      `\nZini Error: ${error.message}\n`
    );
  }
}

/* =========================================================
   COMMAND HANDLER
========================================================= */

async function chatWithZini(
  userInput
) {
  const input =
    userInput.trim();

  const lower =
    input.toLowerCase();

  /*
    AUTO FIX
  */

  if (
    lower.startsWith(
      "auto-fix "
    )
  ) {
    const fileName =
      input
        .slice(9)
        .trim();

    if (!fileName) {
      console.log(
        "\nUsage: auto-fix <file>\n"
      );

      return;
    }

    await fullFixFlow(
      fileName
    );

    return;
  }

  /*
    EXPLAIN
  */

  if (
    lower.startsWith(
      "explain "
    )
  ) {
    const fileName =
      input
        .slice(8)
        .trim();

    if (!fileName) {
      console.log(
        "\nUsage: explain <file>\n"
      );

      return;
    }

    await explainFile(
      fileName
    );

    return;
  }

  /*
    FIX / ANALYSE
  */

  if (
    lower.startsWith(
      "fix "
    )
  ) {
    const fileName =
      input
        .slice(4)
        .trim();

    if (!fileName) {
      console.log(
        "\nUsage: fix <file>\n"
      );

      return;
    }

    await analyseFile(
      fileName
    );

    return;
  }

  /*
    EDIT
  */

  if (
    lower.startsWith(
      "edit "
    )
  ) {
    const fileName =
      input
        .slice(5)
        .trim();

    if (!fileName) {
      console.log(
        "\nUsage: edit <file>\n"
      );

      return;
    }

    await editSandbox(
      fileName
    );

    return;
  }

  /*
    TEST
  */

  if (
    lower.startsWith(
      "test "
    )
  ) {
    const fileName =
      input
        .slice(5)
        .trim();

    if (!fileName) {
      console.log(
        "\nUsage: test <file>\n"
      );

      return;
    }

    await testSandbox(
      fileName
    );

    return;
  }

  /*
    DIFF
  */

  if (
    lower.startsWith(
      "diff "
    )
  ) {
    const fileName =
      input
        .slice(5)
        .trim();

    if (!fileName) {
      console.log(
        "\nUsage: diff <file>\n"
      );

      return;
    }

    await showDiff(
      fileName
    );

    return;
  }

  /*
    NORMAL CHAT
  */

  await normalChat(
    input
  );
}

/* =========================================================
   MAIN LOOP
========================================================= */

function startZini() {
  console.log(
    "\n🤖 Zini is ready!"
  );

  console.log(
    `⚡ Model: ${MODEL}`
  );

  console.log(
    "\nCommands:"
  );

  console.log(
    "  explain <file>   → explain code"
  );

  console.log(
    "  fix <file>       → analyse & suggest"
  );

  console.log(
    "  edit <file>      → edit sandbox"
  );

  console.log(
    "  test <file>      → test sandbox"
  );

  console.log(
    "  diff <file>      → show changes"
  );

  console.log(
    "  auto-fix <file>  → complete safe workflow"
  );

  console.log(
    "  exit             → close Zini\n"
  );

  rl.setPrompt(
    "You: "
  );

  rl.prompt();

  rl.on(
    "line",
    async (input) => {
      /*
        Do not accept another command while
        the current command is running.
      */

      if (busy) {
        console.log(
          "Zini: Please wait for the current operation to finish."
        );

        return;
      }

      const text =
        input.trim();

      if (!text) {
        rl.prompt();
        return;
      }

      if (
        text.toLowerCase() ===
        "exit"
      ) {
        console.log(
          "\nZini: Goodbye!"
        );

        rl.close();

        return;
      }

      busy = true;

      /*
        Pause terminal input while
        AI/task is running.
      */

      rl.pause();

      try {
        await chatWithZini(
          text
        );
      } catch (error) {
        console.log(
          `\nZini Error: ${error.message}\n`
        );
      }

      busy = false;

      if (!rl.closed) {
        rl.resume();
        rl.prompt();
      }
    }
  );

  rl.on(
    "close",
    () => {
      process.exit(0);
    }
  );
}

/* =========================================================
   START ZINI
========================================================= */

startZini();
