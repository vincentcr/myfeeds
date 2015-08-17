import {Feeds} from './api';
import {
  GET_FEEDS_BEGIN,
  GET_FEEDS_INVALIDATE,
  GET_FEEDS_COMPLETED
} from './actionTypes';

export function invalidateFeeds() {
  return { type:GET_FEEDS_INVALIDATE };
}

export function fetchFeedsIfNeeded() {
  return (dispatch, getState) => {
    if (shouldFetchFeeds(getState())) {
      return dispatch(fetchFeeds());
    }
  };
}

function shouldFetchFeeds(state) {
  const {feedList} = state;
  if (feedList == null) {
    return true;
  } else if (feedList.isFetching) {
    return false;
  } else {
    return feedList.didInvalidate;
  }
}

function fetchFeeds () {
  return (dispatch) => {
    dispatch(requestFeeds());
    return Feeds.getAll()
      .then(feeds => { return {feeds}; })
      .catch(err => { return {err, feeds:[]}; })
      .then(res => dispatch(receiveFeeds(res)));
  };
}

function requestFeeds() {
  return { type:GET_FEEDS_BEGIN };
}

function receiveFeeds({feeds,err}) {
  return { type:GET_FEEDS_COMPLETED, feeds, err};
}
