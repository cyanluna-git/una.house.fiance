import {guardedPath} from './tax-migrate';
import {isolatedBaseURL} from '../tests/fixtures/isolated-env';
const baseURL=isolatedBaseURL();
guardedPath(process.env.UNAHOUSE_DB_PATH!);
const realFetch=globalThis.fetch;
globalThis.fetch=(input,init)=>{
 const original=typeof input==='string'?input:input instanceof URL?input.href:input.url;
 if(original.startsWith('http://localhost:3105')) return realFetch(original.replace('http://localhost:3105',baseURL),init);
 throw new Error('Safe API suite forbids unexpected network URL: '+original);
};
