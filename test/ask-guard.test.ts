import assert from "node:assert/strict";
import { isReadOnlySqlCommand } from "../extensions/ask-guard.ts";

assert.equal(isReadOnlySqlCommand(`psql -c "SELECT * FROM users"`), true);
assert.equal(isReadOnlySqlCommand(`sqlite3 app.db 'SELECT 1; SELECT 2'`), true);
assert.equal(isReadOnlySqlCommand(`mysql -e "UPDATE users SET active = 0"`), false);
assert.equal(isReadOnlySqlCommand(`psql -c "SELECT 1; DELETE FROM users"`), false);
assert.equal(isReadOnlySqlCommand(`sql -c "ALTER TABLE users ADD name TEXT"`), false);
assert.equal(isReadOnlySqlCommand(`psql`), false);
assert.equal(isReadOnlySqlCommand(`sqlit query -c local -q "SELECT * FROM users"`), true);
assert.equal(isReadOnlySqlCommand(`sqlit query -c local -q "DELETE FROM users"`), false);
assert.equal(isReadOnlySqlCommand(`sqlit query -c local -f changes.sql`), false);

console.log("ask guard SQL checks ok");
