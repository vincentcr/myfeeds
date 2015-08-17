import 'babel/polyfill';
import {Root} from './components';

document.addEventListener('DOMContentLoaded', () => Root.create(document.body));

window.onerror = function(msg, url, line, col, err) {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} uncaught error: ${msg}   at:${line}:${col}\n`);
  if (err) {
    console.log(err);
  }
};
