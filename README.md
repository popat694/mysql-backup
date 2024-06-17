# Database Backup Script

This script is designed to perform regular backups of MySQL databases using Node.js. It utilizes \`node-cron\` for scheduling and \`mysqldump\` for generating SQL dump files.

## Prerequisites

Ensure you have the following dependencies installed:

- Node.js
- npm (Node Package Manager)
- MySQL server

## Installation

1. Clone this repository to your local machine:

   ```bash
   git clone https://github.com/your/repository.git
   ```

2. Navigate to the project directory:

   ```bash
   cd project-directory
   ```

3. Install required npm packages:

   ```bash
   npm install
   ```

## Configuration

Before running the script, make sure to set the following environment variables:

- \`DB_HOST\`: MySQL host address
- \`DB_USER\`: MySQL username
- \`DB_PASSWORD\`: MySQL password

## Usage

To start the backup process, run the following command:

```bash
node backup.js
```

The script will execute at regular intervals (every minute by default) and create backup files for each database (excluding default ones like \`information_schema\`, \`mysql\`, and \`performance_schema\`) in the \`./db_backup\` directory.

## Customization

You can customize the backup schedule by modifying the cron expression:

```javascript
cron.schedule("* * * * *", () => {
  performBackup();
});
```

The above expression runs the backup process every minute. You can adjust it as per your requirement using the cron syntax.

## Note

- Make sure the MySQL server is running and accessible from the host where the script is executed.
- Ensure proper permissions are set for accessing and writing backup files.

## License

This script is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
`
