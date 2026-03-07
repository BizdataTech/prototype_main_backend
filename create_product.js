import fs from "fs";
import path from "path";

const sampleCreation = () => {
  const original_file = path.join("sample_images", "sample_img.jpg");
  const destination = path.join("sample_images");

  for (let i = 1; i <= 100000; i++) {
    let file = path.join(destination, `sample_img${i}.jpg`);
    fs.copyFileSync(original_file, file);
  }
  console.log("images created");
};

// sampleCreation();
// console.log("hey");
