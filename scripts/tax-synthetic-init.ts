import { guardedPath, migrate } from './tax-migrate';
import Database from 'better-sqlite3';
import {initialCategoryRules} from '../src/lib/db/seed-rules';
async function main() {
const file=guardedPath(process.env.UNAHOUSE_DB_PATH!);
const seed=new Database(file);
seed.exec("CREATE TABLE IF NOT EXISTS category_rules(id INTEGER PRIMARY KEY,keyword TEXT,category_l1 TEXT,category_l2 TEXT,category_l3 TEXT,priority INTEGER); INSERT OR IGNORE INTO category_rules VALUES(1,'Synthetic','other','','',0)");
for(const rule of initialCategoryRules) seed.prepare('INSERT INTO category_rules(keyword,category_l1,category_l2,category_l3,priority) VALUES(?,?,?,?,?)').run(rule.keyword,rule.categoryL1,rule.categoryL2??'',rule.categoryL3??'',rule.priority??0);
seed.close();
const {sqlite}=await import('../src/lib/db/index');
for(let i=0;i<225;i++) {
 const date=i<25?'2024-06-15':'2026-01-01';
 sqlite.prepare("INSERT INTO transactions(date,card_company,merchant,amount) VALUES(?,'Synthetic',?,735)").run(date,'Synthetic candidate '+i);
 sqlite.prepare('INSERT INTO salary_statements(pay_date,gross_pay,total_deductions,net_pay) VALUES(?,2000,200,1800)').run(date);
}
sqlite.close();
console.log(migrate(file,true));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
