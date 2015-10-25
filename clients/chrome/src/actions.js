import {Feeds} from './api';
import {
  FEEDS_FETCH_BEGIN,
  FEEDS_FETCH_INVALIDATE,
  FEEDS_FETCH_COMPLETE,
  FEEDS_UPDATE,
  FEED_CREATE,
  FEED_SELECT,
  FEED_EDIT_BEGIN,
  FEED_EDIT_COMPLETE,
  FEED_SAVE_BEGIN,
  FEED_SAVE_COMPLETE,
  FEED_ADD_ITEM,
} from './actionTypes';

export function invalidateFeeds() {
  return { type:FEEDS_FETCH_INVALIDATE };
}
export function fetchFeedsIfNeeded(done) {
  return (dispatch, getState) => {
    if (shouldFetchFeeds(getState())) {
      return dispatch(fetchFeeds(done));
    } else if (done != null) {
      done();
    }
  };
}

function shouldFetchFeeds(state) {
  const {feedList} = state;
  if (feedList.isFetching) {
    return false;
  } else {
    return feedList.didInvalidate;
  }
}

function fetchFeeds (done) {
  return (dispatch) => {
    dispatch(beginFetchFeeds());
    return Feeds.getAll()
      .then(feeds => { return {feeds}; })
      .catch(err => { return {err, feeds:[]}; })
      .then(res => dispatch(completeFetchFeeds(res)))
      .then(done)
      ;
  };
}

function beginFetchFeeds() {
  return { type:FEEDS_FETCH_BEGIN };
}

function completeFetchFeeds({feeds,err}) {
  return { type:FEEDS_FETCH_COMPLETE, feeds, err};
}

export function fetchCurrentFeedIfNeeded(feedID) {
  return (dispatch, getState) => {
    dispatch(fetchFeedsIfNeeded(() => {
      let feed;
      if (feedID == null) {
        feed = {};
      } else {
        feed = getState().feedList.feeds[feedID];
      }
      dispatch(selectFeed(feed));
    }));
  };
}

export function createFeed() {
  const feed = { key: 'new-feed-' + Date.now(), items:[] };
  return {type:FEED_CREATE, feed};
}

export function selectFeed(feed) {
  return {type:FEED_SELECT, feed};
}

export function beginEditFeed() {
  return {type:FEED_EDIT_BEGIN};
}

export function saveFeed(feed) {
  return dispatch => {
    dispatch(beginSavingFeed(feed));
    return Feeds.save(feed)
      .then((savedFeed) => {
        console.log('savedFeed:', savedFeed);
        dispatch(updateFeeds(savedFeed));
        dispatch(completeEditFeed(savedFeed));
        return {};
      })
      .catch(err => { return {err}; })
      .then(res => dispatch(completeSavingFeed(res)) );
  };
}

function beginSavingFeed(feed) {
  return {type: FEED_SAVE_BEGIN, feed};
}

function completeSavingFeed(res) {
  return {type: FEED_SAVE_COMPLETE, res};
}

function completeEditFeed(feed) {
  return {type:FEED_EDIT_COMPLETE, feed};
}
function updateFeeds(feed) {
  return {type:FEEDS_UPDATE, feed};
}

export function cancelEditFeed() {
  return (dispatch, getState) => {
    const state = getState().feed;
    dispatch(completeEditFeed(state.origFeed));
  };
}

export function addFeedItem() {
  const item = { key: 'new-feed-item-' + Date.now() };
  return {type: FEED_ADD_ITEM, item};
}
