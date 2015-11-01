/* global require */
import 'babel/polyfill';
import jquery from 'jquery';
window.jQuery = jquery;
require('bootstrap'); //if we use import the jQuery global will not be defined yet
import Root from './components/root.jsx';

document.addEventListener('DOMContentLoaded', () => Root.create(document.body));

window.onerror = function(msg, url, line, col, err) {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} uncaught error: ${msg}   at:${line}:${col}\n`);
  if (err) {
    console.log(err);
  }
};
