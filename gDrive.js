const { google } = require("googleapis");
const fs = require("fs");

exports.uploadFileToDrive = async (filePath, fileName) => {
  if (
    process.env.DEBUG.toLowerCase() == true ||
    process.env.DEBUG.toLowerCase() == "true"
  ) {
    console.log("GOOGLE_DRIVE_CLIENT_ID", process.env.GOOGLE_DRIVE_CLIENT_ID);
    console.log(
      "GOOGLE_DRIVE_CLIENT_SECRET",
      process.env.GOOGLE_DRIVE_CLIENT_SECRET
    );
    console.log(
      "GOOGLE_DRIVE_REDIRECT_URI",
      process.env.GOOGLE_DRIVE_REDIRECT_URI
    );
    console.log(
      "GOOGLE_DRIVE_REFRESH_TOKEN",
      process.env.GOOGLE_DRIVE_REFRESH_TOKEN
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_DRIVE_CLIENT_ID,
    process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    process.env.GOOGLE_DRIVE_REDIRECT_URI
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
  });
  const drive = google.drive({
    version: "v3",
    auth: oauth2Client,
  });

  let folderId;
  if (process.env.DRIVE_FOLDER_NAME) {
    // Find the folder ID based on the folder name
    try {
      const response = await drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${process.env.DRIVE_FOLDER_NAME}'`,
        fields: "files(id)",
      });
      if (response.data.files.length > 0) {
        folderId = response.data.files[0].id;
      } else {
        // Folder does not exist, create it
        const folderMetadata = {
          name: process.env.DRIVE_FOLDER_NAME,
          mimeType: "application/vnd.google-apps.folder",
        };
        const folderRes = await drive.files.create({
          resource: folderMetadata,
          fields: "id",
        });
        folderId = folderRes.data.id;
      }
    } catch (error) {
      console.error("Error finding or creating folder:", error.message);
      return;
    }
  }

  // Upload the zip file to Google Drive within the specified folder or root directory
  const fileMetadata = {
    name: fileName,
    parents: folderId ? [folderId] : undefined, // Set parents only if folderId is available
  };
  const media = {
    mimeType: "application/zip",
    body: fs.createReadStream(filePath),
  };

  try {
    const res = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: "id",
    });
    if (
      process.env.DEBUG.toLowerCase() == true ||
      process.env.DEBUG.toLowerCase() == "true"
    ) {
      console.log("File uploaded successfully. File ID:", res.data.id);
    }
  } catch (error) {
    if (
      process.env.DEBUG.toLowerCase() == true ||
      process.env.DEBUG.toLowerCase() == "true"
    ) {
      console.error("Error uploading file:", error.message);
    }
  }
};
