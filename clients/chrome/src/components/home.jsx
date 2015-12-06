
import React, {PropTypes} from 'react';
import { Link } from 'react-router';
import { saveFeedItem } from '../actions';
import {Feeds} from '../api';


export default class Home extends React.Component {

  constructor(...args) {
    super(...args);
    this.state = {};
  }

  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    feeds: PropTypes.object.isRequired,
  }

  render() {
    const {feeds} = this.props;

    const quickAdd = this.renderQuickAddItem(feeds);
    const summary = this.renderSummary(feeds);

    return (
      <div>
        <div className='row titlebar'>
          <div className='col-md12'>
            <h2 className='title'>my feeds</h2>
          </div>
        </div>
        <div className='row'>
          <div className='col-md-12'>
            {summary}
          </div>
        </div>
        <div className='row'>
          <div className='col-md-12'>
            {quickAdd}
          </div>
        </div>
      </div>
    );

  }

  renderQuickAddItem(feeds) {
    const feedSelection = this.renderQuickFeedSelection(feeds);
    const valid = this.state.feedID != null && this.state.link != null;

    return (
      <form className='form-inline' onSubmit={(e) => this.handleAddItem(e)}>
        <div className='form-group'>
          <label htmlFor='quick-add-url' className='sr-only'>Email</label> {' '}
          <input type='url' required={true} onChange={(e) => this.handleOnChange(e)} value={this.state.link} className='form-control' id='quick-add-url' placeholder='http://' />
          <input type='hidden' required={true} value={this.state.feedID} />
        </div>
        {' '}
        <div className='form-group'>
          {feedSelection}
        </div>

        {' '}
        <button type='submit' className='btn btn-default' disabled={!valid}>
          <span className='glyphicon glyphicon-plus' aria-hidden='true'></span>
          {' '}
          add feed item
        </button>
      </form>

    );
  }

  handleOnChange(e) {
    this.setState({ link : e.target.value });
  }

  handleAddItem(e) {
    e.preventDefault();
    const {link,feedID} = this.state;
    const {feeds, dispatch} = this.props;
    const item = {link, title:link};
    dispatch(saveFeedItem(feeds[feedID], item));
  }

  renderQuickFeedSelection(feeds) {

    const {feedID} = this.state;

    const selectFeed = (e, feed) => {
      e.preventDefault();
      this.setState({feedID:feed.id});
    };

    const items = Object.values(feeds).map(feed =>
      <li key={feed.id}>
        <a href='#' onClick={(e) => selectFeed(e, feed)}>
          {feed.title}
        </a>
      </li>
    );

    const title = feedID != null ? feeds[feedID].title : '[Select feed]';

    return (
      <div className='feed-select dropdown'>
        <button className='btn btn-default dropdown-toggle' type='button' id='quick-add-select-feed'
          data-toggle='dropdown' aria-haspopup='true' aria-expanded='true'>
          {title + ' '}
          <span className='caret'></span>
        </button>
        <ul className='dropdown-menu' aria-labelledby='quick-add-select-feed'>
          {items}
        </ul>
      </div>
    );
  }


  renderSummary(feeds) {
    const items = Object.values(feeds).map((feed,idx) => this.renderSummaryFeed({feed,idx}));
    return (
      <table className='feeds-summary table table-condensed'>
        {items}
      </table>
    );
  }

  renderSummaryFeed({idx, feed}) {
    const rssUrl = Feeds.rssUrl(feed.id);
    function onCopy(e) {
      e.preventDefault();
      copyTextToClipboard(rssUrl);
    }
    return (
      <tr key={feed.id}>
        <td>
          {idx + 1}.
        </td>
        <td>
          {feed.title}
        </td>
        <td>
          <Link className='btn btn-default btn-sm feed-link' to={`/feeds/${feed.id}`} title='edit'>
            <span className='glyphicon glyphicon-edit' aria-hidden="true"></span>
          </Link>
        </td>
        <td>
          <a className='btn btn-default btn-sm clipboard' onClick={onCopy} href='#' aria-label='Copy To clipboard' title='Copy rss link to clipboard'>
            <span className='glyphicon glyphicon-copy' aria-hidden="true"></span>
          </a>
        </td>
      </tr>
    );
  }

}

function copyTextToClipboard(text) {
  var textArea = document.createElement('textarea');

  // Place in top-left corner of screen regardless of scroll position.
  textArea.style.position = 'fixed';
  textArea.style.top = 0;
  textArea.style.left = 0;

  // Ensure it has a small width and height. Setting to 1px / 1em
  // doesn't work as this gives a negative w/h on some browsers.
  textArea.style.width = '2em';
  textArea.style.height = '2em';

  // We don't need padding, reducing the size if it does flash render.
  textArea.style.padding = 0;

  // Clean up any borders.
  textArea.style.border = 'none';
  textArea.style.outline = 'none';
  textArea.style.boxShadow = 'none';

  // Avoid flash of white box if rendered for any reason.
  textArea.style.background = 'transparent';


  textArea.value = text;

  document.body.appendChild(textArea);

  textArea.select();

  try {
    var successful = document.execCommand('copy');
    var msg = successful ? 'successful' : 'unsuccessful';
    console.log('Copying text command was ' + msg);
  } catch (err) {
    console.log('Oops, unable to copy');
  }

  document.body.removeChild(textArea);
}
