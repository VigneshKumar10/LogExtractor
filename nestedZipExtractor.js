const express = require("express");
const fs = require("fs");
const extract = require("extract-zip");
const formidable = require("formidable");
const path = require("path");
const glob = require("glob");
const uploadDir = path.join(__dirname, "/uploads/");
const extractDir = path.join(__dirname, "/app/");
const finalExtractDir = path.join(__dirname, "/final/");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
if (!fs.existsSync(extractDir)) {
  fs.mkdirSync(extractDir);
}

const server = express();

const uploadMedia = (req, res, next) => {
  const form = new formidable.IncomingForm();
  // file size limit 100MB. change according to your needs
  form.maxFileSize = 500 * 1024 * 1024;
  form.keepExtensions = true;
  form.multiples = true;
  form.uploadDir = uploadDir;

  // collect all form files and fileds and pass to its callback
  form.parse(req, (err, fields, files) => {
    // when form parsing fails throw error
    if (err) return res.status(500).json({ error: err });

    if (Object.keys(files).length === 0)
      return res.status(400).json({ message: "no files uploaded" });

    // Iterate all uploaded files and get their path, extension, final extraction path
    const filesInfo = Object.keys(files).map((key) => {
      const file = files[key];
      const filePath = file.path;
      const fileExt = path.extname(file.name);
      const fileName = path.basename(file.name, fileExt);
      const destDir = path.join(extractDir, fileName);

      return { filePath, fileExt, destDir };
    });

    // Check whether uploaded files are zip files
    const validFiles = filesInfo.every(({ fileExt }) => fileExt === ".zip");

    // if uploaded files are not zip files, return error
    if (!validFiles)
      return res.status(400).json({ message: "unsupported file format" });

    res.status(200).json({ uploaded: true });

    // iterate through each file path and extract them
    filesInfo.forEach(({ filePath, destDir }) => {
      // create directory with timestamp to prevent overwrite same directory names
      const extractedFiles = extract(
        filePath,
        { dir: `${destDir}_${new Date().getTime()}` },
        (err) => {
          if (err) console.error("extraction failed.");
        }
      );
    });
  });

  // runs when new file detected in upload stream
  form.on("fileBegin", function (name, file) {
    // get the file base name `index.css.zip` => `index.html`
    const fileName = path.basename(file.name, path.extname(file.name));
    const fileExt = path.extname(file.name);
    // create files with timestamp to prevent overwrite same file names
    file.path = path.join(
      uploadDir,
      `${fileName}_${new Date().getTime()}${fileExt}`
    );
  });
  setTimeout(extractInternalFiles, 15000, "test");
};

const extractInternalFiles = () => {
  async function getDirectories(src, callback) {
    glob(src + "/**/*", callback);
  };
  getDirectories(extractDir, function (err, res) {
    try {
      if (err) {
        console.error("Error", err);
      } else {
        res.map((filePath) => {
          if (path.extname(filePath) === ".zip") {
            extract(filePath, { dir: finalExtractDir })
              .catch((err) => console.error(err));
          }
        });
      }
    } catch (error) {
      console.error("there was an error:", error.message);
    }
  });

  return new Promise(resolve => {
    setTimeout(() => {
      resolve('resolved');
      callbackForFiles();
    }, 2000);
  });
};

const callbackForFiles = () => {
  var getDirectories = function async(src, callback) {
    glob(src + "/**/*", callback);
  };
  getDirectories(finalExtractDir, function (err, res) {
    try {
      if (err) {
        console.error("Error", err);
      } else {
        res.map((filePath) => {
          if (path.extname(filePath) === ".zip") {
            extract(filePath, { dir: finalExtractDir })
              .then(() => deleteFileFromPath(filePath))
              .catch((err) => console.error(err));
          }
        });
      }
    } catch (error) {
      console.error("there was an error:", error.message);
    }
  });
  return new Promise(resolve => {
    setTimeout(() => {
      resolve('resolved');
      deleteUnwantedFiles();
    }, 2000);
  });
};

const deleteFileFromPath = async (path) => {
  fs.unlink(path, (err) => {
    if (err) {
      console.log("failed to delete local image:" + err);
    } else {
      console.log("successfully deleted local image");
    }
  });
};

const deleteUnwantedFiles = async () => {
  var getDirectories = function async(src, callback) {
    glob(src + "/**/*", callback);
  };
  getDirectories(finalExtractDir, function (err, res) {
    try {
      if (err) {
        console.error("Error", err);
      } else {
        res.map(async (filePath) => {
          if (path.basename(filePath).toString().includes("runtime_cp")) {
            console.log("Retaining", path.basename(filePath));
          } else await deleteFileFromPath(filePath);
        });
      }
    } catch (error) {
      console.error("there was an error:", error.message);
    }
  });
};

server.post("/upload", uploadMedia);

server.listen(3000, (err) => {
  console.log(`Server running at 3000`);
  if (err) throw err;
});
