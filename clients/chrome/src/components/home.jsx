
import React, {PropTypes} from 'react';
import { Link } from 'react-router';
import { saveFeedItem } from '../actions';


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

    return (
      <div>
        <div className='row titlebar'>
          <div className='col-md12'>
            <h2 className='title'>my feeds</h2>
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
        <a href="#" onClick={(e) => selectFeed(e, feed)}>
          {feed.title}
        </a>
      </li>
    );

    const title = feedID != null ? feeds[feedID].title : '[Select feed]';

    return (
      <div className="feed-select dropdown">
        <button className="btn btn-default dropdown-toggle" type="button" id="quick-add-select-feed"
          data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">
          {title + ' '}
          <span className="caret"></span>
        </button>
        <ul className="dropdown-menu" aria-labelledby="quick-add-select-feed">
          {items}
        </ul>
      </div>
    );
  }


  renderSummary(feeds) {
    const items = Object.values(feeds).map(feed => this.renderSummaryFeed(feed));
    return (
      <ol className='feeds-summary'>
        {items}
      </ol>
    );
  }

  renderSummaryFeed(feed) {
    const itemCount = feed.items.length;
    return (
      <li key={feed.id}>
        <Link className='feed-link' to={`/feeds/${feed.id}`}>
          {feed.title}
        </Link>
        {' '}
        ({itemCount} items)
      </li>
    );
  }

}
