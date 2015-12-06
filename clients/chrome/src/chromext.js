/* global chrome */

/*
todo:
  1) update menu on auth and feeds change
  2) show feedback on add success/error
  3) popup view should show rss links and logout
  4) integrate context menu with redux??
  5) add regular webapp and firefox addon
*/

import {Users,Feeds} from './api';

const FEED_MENU_RE = /^feeds\.(.+)$/;

function onMenuClick(info, tab) {
  const {menuItemId,linkUrl} = info;
  const feedMatch = FEED_MENU_RE.exec(menuItemId);
  if (feedMatch) {
    const feedID = feedMatch[1];
    addFeedItem({feedID, link:linkUrl});
  } else {
    signin(tab);
  }
}

function addFeedItem({feedID, link}) {
  const item = {link, title:link};
  Feeds.saveItem({feedID, item}).catch((err) => {
    console.log('error adding feed item:', err);
  });
}

function signin() {
  chrome.tabs.create({'url': chrome.extension.getURL('popup.html')});
}

function createMenu() {
  if (Users.isSignedIn()) {
    createFeedsMenu();
  } else {
    createSigninMenu();
  }
}

function createFeedsMenu() {
  Feeds.getAll()
  .then((feeds) => {
    feeds.forEach((feed) => {
      const item = {title: feed.title, contexts:['link'], id: 'feeds.' + feed.id};
      chrome.contextMenus.create(item);
    });
  }).catch((err) => {
    console.log('error creating feeds menu:', err);
  });
}

function createSigninMenu() {
  chrome.contextMenus.create({title: 'Sign in to add feeds', contexts:['link'], id:'signin'});
}

chrome.contextMenus.onClicked.addListener(onMenuClick);
chrome.runtime.onInstalled.addListener(createMenu);
