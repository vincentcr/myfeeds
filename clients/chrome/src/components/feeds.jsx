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
    const feedNodes = Object.values(feeds).map(feed => this.renderFeed(feed));

    return (
      <div className="feeds">

        <h4>feeds</h4>

        {isFetching && feedCount === 0 &&
          <div className='loading'>Loading...</div>
        }
        {!isFetching && feedCount === 0 &&
          <div className='emtpy'>Empty.</div>
        }
        {feedCount > 0 &&
          <div style={{ opacity: isFetching ? 0.5 : 1 }}>
            <ul className='feed-list'>
              {feedNodes}
              <li>
                <Link className='feed-link' to='/feeds/new'>
                  add new feed...
                </Link>
              </li>
            </ul>
          </div>
        }

        {err &&
          <span className='error'>
            {err.message || err.toString()}
          </span>
        }

        {children}
      </div>
    );
  }

  renderFeed(feed) {
    const empty = feed.items.length === 0;
    const countLabel = empty ? 'empty' : `${feed.items.length} items`;
    return (
      <li key={feed.id}>
        <Link className='feed-link' to={`/feeds/${feed.id}`}>
          {feed.title}
        </Link>
        <span className='feed-count'>({countLabel})</span>
      </li>
    );
  }
}
