import React, {findDOMNode, PropTypes} from 'react';
import { connect } from 'react-redux';
import { fetchCurrentFeedIfNeeded, beginEditFeed, saveFeed, cancelEditFeed, addFeedItem, } from '../actions';
import classNames from 'classnames';

@connect(state => state.feed)
export default class Feed extends React.Component {

  static propTypes = {
    children: PropTypes.any,
    dispatch: PropTypes.func.isRequired,
  }

  getInitialState() {
    return {};
  }

  componentDidMount() {
    const feedID = this.props.params.feedID;
    this.props.dispatch(fetchCurrentFeedIfNeeded(feedID));
  }

  handleBeginEditFeed(event) {
    event.preventDefault();
    this.props.dispatch(beginEditFeed());
  }

  handleSaveFeed(event) {
    event.preventDefault();
    const title = findDOMNode(this.refs.title).value;
    const items = this.getItems().map(item => item.state);
    const id = this.props.currentFeed.id;
    this.props.dispatch(saveFeed({ id, title, items }));
  }

  handleCancelEditFeed(event) {
    event.preventDefault();
    if (!this.isModified() || confirm('You have unsaved changes. Continue?')) {
      this.props.dispatch(cancelEditFeed());
    }
  }

  handleAddItem(event) {
    event.preventDefault();
    this.markModified();
    this.props.dispatch(addFeedItem());
  }

  markModified() {
    this.setState({ isModified: true });
  }

  isModified() {
    return this.state.isModified || this.getItems().some(item => item.state.isModified);
  }

  render() {
    const cssClasses = classNames({
      'feed' : true,
      'edit-mode' : this.props.isEditing,
    });
    const feed = this.props.currentFeed;
    return (
      <div className={cssClasses}>
        {!feed &&
          <div className='loading'>Loading...</div>
        }
        {feed &&
          <div>
            { this.renderButtons() }
            { this.renderTitle() }
            <FeedItemList ref='itemList' isEditing={this.props.isEditing} items={feed.items} />
          </div>
        }
      </div>
    );
  }

  getItems() {
    const itemList = this.refs.itemList;
    const items = itemList.getItems();
    return items;
  }

  renderButtons() {
    const buttons = !this.props.isEditing? this.renderViewButtons() : this.renderEditButtons();
    return (
      <div className='buttons'>
        {buttons}
      </div>
    );
  }

  renderViewButtons() {
    return (
      <button className='edit' onClick={e => this.handleBeginEditFeed(e)}>edit</button>
    );
  }

  renderEditButtons() {
    return (
      <span>
        <button className='save' onClick={e => this.handleSaveFeed(e)}>save</button>
        <button className='cancel' onClick={e => this.handleCancelEditFeed(e)}>cancel</button>
        <button className='add-item' onClick={e => this.handleAddItem(e)}>add item</button>
      </span>
    );
  }

  renderTitle() {
    const {title} = this.props.currentFeed;
    if (!this.props.isEditing) {
      return this.renderTitleView(title);
    } else {
      return this.renderTitleEdit(title);
    }
  }

  renderTitleView(title) {
    return (
      <h2 className='title'>
        {title}
      </h2>
    );
  }

  renderTitleEdit(title) {
    return (
      <input type='text' ref='title' placeholder='title' defaultValue={title} onChange={e => this.markModified(e)} />
    );
  }
}

class FeedItemList extends React.Component {

  getItems() {
    const items = Object.keys(this.refs)
      .filter(key => key.startsWith('item_'))
      .map(key => this.refs[key]);
    return items;
  }

  render() {
    const itemNodes = this.props.items.map((item, idx) => React.createElement(FeedItem, {
        item,
        key: item.key || item.id,
        isEditing: this.props.isEditing,
        ref: `item_${idx}`,
    }));
    return (
      <ul className='items'>
        {itemNodes}
      </ul>
    );
  }
}

class FeedItem extends React.Component {

  constructor(props) {
    super(props);
    const {item} = this.props;
    this.state = {...item};
  }

  handleOnChange(field, event) {
    const value = event.target.value;
    this.setState({
      ...this.state,
      isModified: true,
      [field] : value,
    });
  }

  render() {
    const item = this.props.item;
    const node = this.props.isEditing ? this.renderEdit(item) : this.renderView(item);
    return (
      <li className='feed-item'> {node} </li>
    );
  }

  renderView(item) {
    return (
      <a href={item.link} target={item.id}>{item.title}</a>
    );
  }

  renderEdit(item) {
    return (
      <div>
        <input type='checkbox'></input>
        <input type='text' ref='title' defaultValue={item.title} placeholder='title' onChange={this.handleOnChange.bind(this, 'title')} />
        <input type='text' ref='link' defaultValue={item.link} placeholder='link' onChange={this.handleOnChange.bind(this, 'link')} />
      </div>
    );
  }

}
