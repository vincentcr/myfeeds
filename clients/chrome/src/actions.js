import {Feeds} from './api';
import * as actionTypes from './actionTypes';

export function getFeeds() {
  return (dispatch) => Feeds.getAll().then(
    (feeds) => {
      dispatch({
        type: actionTypes.GET_FEEDS,
        feeds: feeds,
      });
  });
}
