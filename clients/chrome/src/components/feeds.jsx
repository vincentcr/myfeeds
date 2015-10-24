import React, {PropTypes} from 'react';
import { Link } from 'react-router';
import { connect } from 'react-redux';
import { fetchFeedsIfNeeded } from '../actions';

@connect(state => state.feedList)
export default class FeedList extends React.Component {

  static propTypes = {
    children: PropTypes.any,
    dispatch: PropTypes.func.isRequired,
  }

  static contextTypes = {
    history: PropTypes.object.isRequired,
  }

  componentDidMount() {
    console.log('feed list, component did mount');
    const { dispatch } = this.props;
    dispatch(fetchFeedsIfNeeded());
  }

  handleAddNew() {
    this.context.history.replaceState(null, '/feeds/new');
  }

  render() {
    const { feeds, isFetching, children, err } = this.props;
    const feedCount = Object.keys(feeds).length;

    return (
      <div className="feeds">
        {isFetching && feedCount === 0 &&
          <div className='loading'>Loading...</div>
        }
        {!isFetching && feedCount === 0 &&
          <div className='emtpy'>Empty.</div>
        }
        {feedCount > 0 &&
          <div style={{ opacity: isFetching ? 0.5 : 1 }}>
            <Feeds {...this.props} />
          </div>
        }

        <div>
          <button onClick={this.handleAddNew.bind(this)}>add new feed</button>
        </div>

        {err &&
          <span className='error'>
            {err.message || err.toString()}
          </span>
        }

        {children}
      </div>
    );
  }

}

class Feeds extends React.Component {
  constructor(props) {
    super(props);
  }

  static propTypes = {
    feeds: PropTypes.object,
  }

  render() {
    const {feeds} = this.props;
    const feedNodes = Object.values(feeds).map(feed => this.renderFeed(feed));
    return (
      <ul className='feed-list'>
        {feedNodes}
      </ul>
    );
  }

  renderFeed(feed) {
    return (
      <li key={feed.id}>
        <Link className='feed-link' to={`/feeds/${feed.id}`}>
          {feed.title}
        </Link>
        ({feed.items.length} items)
      </li>
    );
  }
}
