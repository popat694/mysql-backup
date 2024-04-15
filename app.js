const fs = require("fs");
const cron = require("node-cron");
const mysqldump = require("mysqldump");
const mysql = require("mysql2");
const archiver = require("archiver");
const path = require("path");

require("dotenv").config();

const { uploadFileToDrive } = require("./gDrive");

// Function to redirect console output to a file
const redirectConsoleOutputToFile = (filePath) => {
  const logStream = fs.createWriteStream(filePath, { flags: "a" }); // 'a' means append mode

  // Override console.log to write to the log file
  const originalLog = console.log;
  console.log = function (...args) {
    const message = `${getCurrentDateTime()} - ${args.join(" ")}`;
    logStream.write(message + "\n");
    originalLog.apply(console, args);
  };
};

// Function to get current date and time in a formatted string
const getCurrentDateTime = () => {
  const now = new Date();
  return now.toISOString();
};

// Set the path to your log file
const logFilePath = path.join(__dirname, "console.log");

// Redirect console output to the log file
redirectConsoleOutputToFile(logFilePath);

// Function to get list of databases excluding default ones
const getDatabases = (connection) => {
  return new Promise((resolve, reject) => {
    connection.query("SHOW DATABASES", (error, results, fields) => {
      if (error) {
        reject(error);
        return;
      }
      const databases = results
        .map((row) => row.Database)
        .filter(
          (db) =>
            !["information_schema", "mysql", "performance_schema"].includes(db)
        );
      resolve(databases);
    });
  });
};
if (
  process.env.DEBUG.toLowerCase() == true ||
  process.env.DEBUG.toLowerCase() == "true"
) {
  console.log("DB_HOST", process.env.DB_HOST);
  console.log("DB_USER", process.env.DB_USER);
  console.log("DB_PASSWORD", process.env.DB_PASSWORD);
}

// MySQL connection details
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const dbBackup = async (dbName, fileName) => {
  try {
    // Execute mysqldump only if dbName is not empty
    if (dbName.trim() !== "") {
      await mysqldump({
        connection: {
          host: process.env.DB_HOST,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: dbName,
        },
        dumpToFile: fileName,
      });
      if (
        process.env.DEBUG.toLowerCase() == true ||
        process.env.DEBUG.toLowerCase() == "true"
      ) {
        console.log(`Backup process for ${dbName} successful`);
      }
    } else {
      if (
        process.env.DEBUG.toLowerCase() == true ||
        process.env.DEBUG.toLowerCase() == "true"
      ) {
        console.log(`Skipping backup for empty database name`);
      }
    }
  } catch (error) {
    console.error(`Backup process for ${dbName} failed: ${error.message}`);
  }
};

const performBackup = async () => {
  const databases = await getDatabases(connection);
  const backupFolder = `./db_backup/${Date.now()}`;

  try {
    // Create a new folder for each backup
    fs.mkdirSync(backupFolder);
  } catch (error) {
    console.error(`Failed to create backup folder: ${error.message}`);
    return;
  }

  for (let index = 0; index < databases.length; index++) {
    const dbName = databases[index];
    const fileName = `${backupFolder}/${dbName}_backup.sql`;
    await dbBackup(dbName, fileName);
  }

  // After all backups are completed, create a zip file of the backup folder
  const outputZip = fs.createWriteStream(
    `./db_backup/${Date.now()}_backup.zip`
  );
  const archive = archiver("zip", {
    zlib: { level: 9 }, // Sets the compression level.
  });

  outputZip.on("close", async () => {
    if (
      process.env.DEBUG.toLowerCase() == true ||
      process.env.DEBUG.toLowerCase() == "true"
    ) {
      console.log("Backup files zipped successfully");
    }
    // Upload the zip file to Google Drive
    try {
      await uploadFileToDrive(outputZip.path, `${Date.now()}_backup.zip`);
      if (
        process.env.DEBUG.toLowerCase() == true ||
        process.env.DEBUG.toLowerCase() == "true"
      ) {
        console.log("Backup file uploaded to Google Drive");
      }
    } catch (error) {
      if (
        process.env.DEBUG.toLowerCase() == true ||
        process.env.DEBUG.toLowerCase() == "true"
      ) {
        console.error("Error uploading backup file to Google Drive:", error);
      }
    }
    // Remove the backup folder after zipping
    fs.rmdirSync(backupFolder, { recursive: true }, (err) => {
      if (err) {
        if (
          process.env.DEBUG.toLowerCase() == true ||
          process.env.DEBUG.toLowerCase() == "true"
        ) {
          console.error(`Failed to remove backup folder: ${err.message}`);
        }
      } else {
        if (
          process.env.DEBUG.toLowerCase() == true ||
          process.env.DEBUG.toLowerCase() == "true"
        ) {
          console.log(`Backup folder ${backupFolder} removed`);
        }
      }
    });
  });

  outputZip.on("end", () => {
    if (
      process.env.DEBUG.toLowerCase() == true ||
      process.env.DEBUG.toLowerCase() == "true"
    ) {
      console.log("Data has been drained");
    }
  });

  archive.on("warning", (err) => {
    if (err.code === "ENOENT") {
      if (
        process.env.DEBUG.toLowerCase() == true ||
        process.env.DEBUG.toLowerCase() == "true"
      ) {
        console.warn(err);
      }
    } else {
      throw err;
    }
  });

  archive.on("error", (err) => {
    throw err;
  });

  // Pipe archive data to the output file
  archive.pipe(outputZip);

  // Add backup folder contents to the zip file
  archive.directory(backupFolder, false);

  // Finalize the zip file
  archive.finalize();
};

const cronSchedule = process.env.CRON_SCHEDULE || "0 0 * * *";

cron.schedule(cronSchedule, () => {
  performBackup();
});
