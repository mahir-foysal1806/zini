function checkAge(age {
  // ভুল ১: অ্যাসাইনমেন্ট অপারেটর '=' ব্যবহার করা হয়েছে (তুলনা করতে '===' ব্যবহার করা উচিত ছিল)
  if (ag= 18) {
    console.log("আপনার বয়স ১৮ বছর!");
  } else {
    console.log("আপনার বয়স ১৮ বছর নয়।");
  }
}

// ভুল ২: কনস্ট্যান্ট ভেরিয়েবলের মান পরিবর্তন করার চেষ্টা
const userRole admin";
userRole = "editor"; // TypeError: Assignment to constant variable.

checkAge(10);