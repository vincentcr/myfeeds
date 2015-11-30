import history from './history';
import {Feeds} from './api';
import {
  ASYNC_BEGIN,
  ASYNC_COMPLETE,
  FEEDS_FETCH_INVALIDATE,
  FEEDS_FETCH_COMPLETE,
  FEEDS_UPDATE,
  FEEDS_DELETE,
  FEED_CREATE,
  FEED_SELECT,
  FEED_DESELECT,
  FEED_UPDATE,
  FEED_ITEM_DELETE,
} from './stores';

function asyncBegin() {
  return { type:ASYNC_BEGIN };
}

function asyncComplete(res) {
  return { type:ASYNC_COMPLETE, res};
}

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
    dispatch(asyncBegin());
    setTimeout(() => {
    return Feeds.getAll()
      .then(feeds => { return {feeds}; })
      .catch(err => { return {err, feeds:[]}; })
      .then(res => dispatch(completeFetchFeeds(res)))
      .then(res => dispatch(asyncComplete(res)))
      .then(done)
      ;
    }, 1000);
  };
}


function completeFetchFeeds({feeds,err}) {
  return { type:FEEDS_FETCH_COMPLETE, feeds, err};
}

export function fetchCurrentFeedIfNeeded(feedID) {
  return (dispatch, getState) => {
    dispatch(fetchFeedsIfNeeded(() => {
      const feed = getState().feedList.feeds[feedID];
      if (feed == null) {
        history.replaceState(null, '/feeds');
      } else {
        dispatch(selectFeed(feed));
      }
    }));
  };
}

export function createFeed(title) {
  return (dispatch) => {
    return Feeds.create(title).then((feed) => {
      dispatch({type:FEED_CREATE, feed});
      dispatch({type:FEEDS_UPDATE, feed});
      history.replaceState(null, `/feeds/${feed.id}`);
    });
  };
}

export function deleteFeed(feed) {
  return (dispatch, getState) => {
    const {feeds} = getState().feedList;
    const adjFeed = findAdjacentFeed({feed, feeds});

    return Feeds.delete(feed).then(() => {
      dispatch({type:FEEDS_DELETE, feed});
      if (adjFeed != null) {
        dispatch(selectFeed(adjFeed));
        history.replaceState(null, `/feeds/${adjFeed.id}`);
      } else {
        dispatch({type:FEED_DESELECT});
        history.replaceState(null, '/feeds');
      }
    });
  };
}

function findAdjacentFeed({feed, feeds}) {
  const feedIDs = Object.keys(feeds);
  const curIdx = feedIDs.findIndex(id => id === feed.id);
  const adjIdx = (curIdx === 0) ? 1 : curIdx - 1;
  return feeds[feedIDs[adjIdx]];
}

export function selectFeed(feed) {
  return {type:FEED_SELECT, feed};
}

export function saveFeed(feed) {
  return (dispatch, getState) => {
    const origFeed = getState().feed.feed;
    updateFeed({dispatch, feed});
    dispatch(asyncBegin());
    return Feeds.save(feed)
      .catch(err => {
        console.log('error', err);
        updateFeed({dispatch, feed:origFeed});
        return {err};
      })
      .then(res => dispatch(asyncComplete(res)));
  };
}

function updateFeed({dispatch, feed}) {
  dispatch({type:FEED_UPDATE, feed});
  dispatch({type:FEEDS_UPDATE, feed});
}

export function saveFeedItem(feed, item) {
  return (dispatch) => {
    const isNew = item.id == null;
    const origItem = feed.items.find(i => i.id === item.id);
    dispatch(asyncBegin());
    return Feeds.saveItem({feed, item})
      .then(item => {
        updateFeedItem({dispatch, feed, item});
        if (isNew) {
          history.replaceState(null, `/feeds/${feed.id}/items/${item.id}`);
        }
      })
      .catch(err => {
        console.log('error', err);
        if (origItem != null) {
          updateFeedItem({dispatch, feed, item:origItem});
        }
        return {err};
      })
      .then(res => dispatch(asyncComplete(res)));
  };
}

function updateFeedItem({dispatch, feed, item}) {
      const items = feed.items
        .filter(i => i.id !== item.id)
        .concat(item);
      const updatedFeed = {...feed, items};
      updateFeed({dispatch, feed:updatedFeed});
}

export function deleteFeedItem(feed, item) {
  return (dispatch) => {
    return Feeds.deleteItem({feed, item}).then(() => {
      dispatch({type:FEED_ITEM_DELETE, feed, item});
      history.replaceState(null, `/feeds/${feed.id}`);
    });
  };
}
