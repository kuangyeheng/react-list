import React from 'react';

export class List extends React.Component {
  static propTypes = {
    itemRenderer: React.PropTypes.func,
    itemsRenderer: React.PropTypes.func,
    length: React.PropTypes.number,
    pageSize: React.PropTypes.number,
    threshold: React.PropTypes.number
  };

  static defaultProps = {
    itemRenderer: (i, j) => <div key={j}>{i}</div>,
    itemsRenderer: (items, ref) => <div ref={ref}>{items}</div>,
    length: 0,
    pageSize: 10,
    threshold: 500
  };

  state = {
    from: 0,
    size: this.props.pageSize
  };

  componentWillReceiveProps(next) {
    const {size} = this.state;
    const {length, pageSize} = next;
    this.setState({size: Math.min(Math.max(size, pageSize), length)});
  }

  componentDidMount() {
    this.scrollParent = this.getScrollParent();
    this.updateFrame = this.updateFrame.bind(this);
    window.addEventListener('resize', this.updateFrame);
    this.scrollParent.addEventListener('scroll', this.updateFrame);
    this.updateFrame();
  }

  componentDidUpdate() {
    this.updateFrame();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateFrame);
    this.scrollParent.removeEventListener('scroll', this.updateFrame);
  }

  getScrollParent() {
    for (let el = React.findDOMNode(this); el; el = el.parentElement) {
      const overflowY = window.getComputedStyle(el).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') return el;
    }
    return window;
  }

  getScroll() {
    const {scrollParent} = this;
    const el = React.findDOMNode(this);
    if (scrollParent === el) return el.scrollTop;
    if (scrollParent === window) return -el.getBoundingClientRect().top;
    return scrollParent.scrollTop - el.offsetTop;
  }

  getViewportHeight() {
    const {scrollParent} = this;
    const {innerHeight, clientHeight} = scrollParent;
    return scrollParent === window ? innerHeight : clientHeight;
  }

  updateFrame() {
    const frameBottom = this.getScroll() + this.getViewportHeight();
    const elBottom = React.findDOMNode(this).getBoundingClientRect().height;
    const {pageSize, length, threshold} = this.props;
    if (elBottom >= frameBottom + threshold) return;
    this.setState({size: Math.min(this.state.size + pageSize, length)});
  }

  render() {
    const {from, size} = this.state;
    const items = [];
    for (let i = 0; i < size; ++i) {
      items.push(this.props.itemRenderer(from + i, i));
    }
    return this.props.itemsRenderer(items, c => this.items = c);
  }
};

List.prototype.shouldComponentUpdate =
  React.addons.PureRenderMixin.shouldComponentUpdate;

export class UniformList extends List {
  static propTypes = {
    itemHeight: React.PropTypes.number,
    itemRenderer: React.PropTypes.func,
    itemsPerRow: React.PropTypes.number,
    itemsRenderer: React.PropTypes.func,
    length: React.PropTypes.number,
    threshold: React.PropTypes.number
  };

  static defaultProps = {
    itemRenderer: (i, j) => <div key={j}>{i}</div>,
    itemsRenderer: (items, ref) => <div ref={ref}>{items}</div>,
    length: 0,
    threshold: 500
  };

  state = {
    from: 0,
    itemHeight: this.props.itemHeight || 0,
    itemsPerRow: this.props.itemsPerRow || 1,
    size: 1
  };

  componentWillReceiveProps(next) {
    let {itemsPerRow, from, size} = this.state;
    const {length} = next;
    from = Math.max(Math.min(from, this.getMaxFrom(length, itemsPerRow)), 0);
    size = Math.min(Math.max(size, 1), length - from);
    this.setState({from, size});
  }

  setScroll(y) {
    const {scrollParent} = this;
    if (scrollParent === window) return window.scrollTo(0, y);
    scrollParent.scrollTop = y;
  }

  scrollTo(i) {
    const {itemHeight} = this.state;
    const current = this.getScroll();
    const max = Math.floor(i / this.state.itemsPerRow) * itemHeight;
    const min = max - this.getViewportHeight() + itemHeight;
    if (current > max) this.setScroll(max);
    if (current < min) this.setScroll(min);
  }

  updateFrame() {
    let {itemHeight, itemsPerRow} = this.props;
    let itemEls, firstRect;

    if (itemHeight == null || itemsPerRow == null) {
      let itemEls = React.findDOMNode(this.items).children;
      if (!itemEls.length) return;

      firstRect = itemEls[0].getBoundingClientRect();
      itemHeight = Math.floor(firstRect.height);
      if (!itemHeight) return;

      const firstRowBottom = Math.floor(firstRect.top) + itemHeight;
      itemsPerRow = 1;
      for (
        let item = itemEls[itemsPerRow];
        item && Math.floor(item.getBoundingClientRect().top) < firstRowBottom;
        item = itemEls[itemsPerRow]
      ) ++itemsPerRow;
    }

    if (!itemHeight || !itemsPerRow) return;

    const {threshold} = this.props;
    const top = Math.max(0, this.getScroll() - threshold);
    const from = Math.min(
      Math.floor(top / itemHeight) * itemsPerRow,
      this.getMaxFrom(this.props.length, itemsPerRow)
    );

    const viewportHeight = this.getViewportHeight() + (threshold * 2);
    const size = Math.min(
      (Math.ceil(viewportHeight / itemHeight) + 1) * itemsPerRow,
      this.props.length - from
    );

    this.setState({itemsPerRow, from, itemHeight, size});
  }

  getMaxFrom(length, itemsPerRow) {
    return Math.max(0, length - itemsPerRow - (length % itemsPerRow));
  }

  getSpace(n) {
    return (n / this.state.itemsPerRow) * this.state.itemHeight;
  }

  render() {
    const position = 'relative';
    const height = this.getSpace(this.props.length);
    const transform = `translate(0, ${this.getSpace(this.state.from)}px)`;
    return (
      <div style={{position, height}}>
        <div style={{position, WebkitTransform: transform, transform}}>
          {super.render()}
        </div>
      </div>
    );
  }
};
