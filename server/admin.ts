/**
 * Account maintenance from the server box:
 *   npm run admin -- list
 *   npm run admin -- add <username> <password> [--admin]
 *   npm run admin -- passwd <username> <password>
 */
import { hashPassword, normalizeUsername, validatePassword, validateUsername } from "./auth.js";
import { HeoDatabase } from "./database.js";

const db = new HeoDatabase();
const [command, ...args] = process.argv.slice(2);

function usage(): never {
  console.log("Usage: npm run admin -- <list | add <user> <pass> [--admin] | passwd <user> <pass>>");
  process.exit(1);
}

switch (command) {
  case "list": {
    const users = db.listUsers();
    if (users.length === 0) console.log("(no accounts yet)");
    for (const user of users) {
      console.log(`${user.username}${user.isAdmin ? " [admin]" : ""}${user.disabled ? " [disabled]" : ""}`);
    }
    break;
  }
  case "add": {
    const [username, password] = args;
    const checkedName = validateUsername(username);
    if (!checkedName.valid) { console.error(checkedName.error); process.exit(1); }
    const checkedPassword = validatePassword(password);
    if (!checkedPassword.valid) { console.error(checkedPassword.error); process.exit(1); }
    const usernameNorm = normalizeUsername(checkedName.username);
    if (db.getUserAuth(usernameNorm)) { console.error("That username already exists."); process.exit(1); }
    const { hash, salt } = await hashPassword(checkedPassword.password);
    const user = db.createUser({
      username: checkedName.username,
      usernameNorm,
      passwordHash: hash,
      passwordSalt: salt,
      isAdmin: args.includes("--admin") || db.countUsers() === 0,
    });
    console.log(`Created ${user.username}.`);
    break;
  }
  case "passwd": {
    const [username, password] = args;
    const record = db.getUserAuth(normalizeUsername(username));
    if (!record) { console.error("No such user."); process.exit(1); }
    const checkedPassword = validatePassword(password);
    if (!checkedPassword.valid) { console.error(checkedPassword.error); process.exit(1); }
    const { hash, salt } = await hashPassword(checkedPassword.password);
    db.setPassword(record.user.id, hash, salt);
    console.log(`Updated password for ${record.user.username}.`);
    break;
  }
  default:
    usage();
}

db.close();
