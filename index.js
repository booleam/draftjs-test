import React, { Component } from 'react'
import { render } from 'react-dom'
import { Editor, EditorState, RichUtils, Entity, CompositeDecorator, AtomicBlockUtils, convertToRaw } from 'draft-js'
import { stateToHTML } from 'draft-js-export-html'
import { stateFromHtml } from 'draft-js-import-html'
import './base.css'

class MyEditor extends Component {
  constructor(props) {
    super(props);

    const decorator = new CompositeDecorator([
      {
        strategy: findLinkEntities,
        component: Link
      }
    ]);

    this.state = {
      editorState: EditorState.createEmpty(decorator),
      showLinkURLInput: false,
      showImageURLInput: false,
      linkUrlValue: '',
      imageUrlValue: ''
    };

    this.focus = () => this.refs.editor.focus();
    this.onChange = (editorState) => this.setState({ editorState });

    this.handleKeyCommand = this._handleKeyCommand.bind(this);
    this.toggleInlineStyle = this._toggleInlineStyle.bind(this);
    this.toggleBlockType = this._toggleBlockType.bind(this);

    this.promptForLink = this._promptForLink.bind(this);
    this.onLinkURLChange = (e) => this.setState({ linkUrlValue: e.target.value });
    this.confirmLink = this._confirmLink.bind(this);
    this.onLinkInputKeyDown = this._onLinkInputKeyDown.bind(this);
    this.removeLink = this._removeLink.bind(this);
    this.cancelAddLink = this._cancelAddLink.bind(this);

    this.undo = this._undo.bind(this);
    this.redo = this._redo.bind(this);

    this.addImage = this._addImage.bind(this);
    this.onImageURLChange = (e) => this.setState({ imageUrlValue: e.target.value });
    this.onImageURLInputKeyDown = this._onImageURLInputKeyDown.bind(this);

    this.toString = this._toString.bind(this);

    this.logState = () => {
      const content = this.state.editorState.getCurrentContent();
      console.log(convertToRaw(content));
      console.log(this.state.editorState.getSelection());
    };
  }

  _toggleInlineStyle(inlineStyle) {
    this.onChange(
      RichUtils.toggleInlineStyle(
        this.state.editorState,
        inlineStyle
      )
    );
  }

  _toggleBlockType(blockType) {
    this.onChange(
      RichUtils.toggleBlockType(
        this.state.editorState,
        blockType
      )
    )
  }

  _handleKeyCommand(command) {
    const newState = RichUtils.handleKeyCommand(this.state.editorState, command);
    if (newState) {
      this.onChange(newState);
      return true;
    }
    return false;
  }

  _promptForLink(e) {
    e.preventDefault();
    const { editorState } = this.state;
    const selection = editorState.getSelection();
    if(!selection.isCollapsed()) {
      this.setState({
        showLinkURLInput: true,
        linkUrlValue: '',
      }, () => {
        setTimeout(() => this.refs.url.focus(), 0);
      });
    }
  }

  _confirmLink(e) {
    e.preventDefault();
    const { editorState, linkUrlValue } = this.state;
    const entityKey = Entity.create('LINK', 'MUTABLE', { url: linkUrlValue });
    this.setState({
      editorState: RichUtils.toggleLink(
        editorState,
        editorState.getSelection(),
        entityKey
      ),
      showLinkURLInput: false,
      linkUrlValue: ''
    }, () => {
      setTimeout(() => this.refs.editor.focus(), 0);
    });
  }

  _onLinkInputKeyDown(e) {
    if(e.which === 13) {
      this._confirmLink(e);
    }
  }

  _removeLink(e) {
    e.preventDefault();
    const { editorState } = this.state;
    const selection = editorState.getSelection();
    if(!selection.isCollapsed()) {
      this.setState({
        editorState: RichUtils.toggleLink(editorState, selection, null),
      })
    }
  }

  _cancelAddLink(e) {
    e.preventDefault();
    this.setState({
      showLinkURLInput: false,
      linkUrlValue: ''
    })
  }

  _undo(e) {
    e.preventDefault();
    const { editorState } = this.state;
    this.onChange(
      EditorState.undo(editorState)
    );
  }

  _redo(e) {
    e.preventDefault();
    const { editorState } = this.state;
    this.onChange(
      EditorState.redo(editorState)
    );
  }

  _addImage(e) {
    e.preventDefault();
    const { editorState, imageUrlValue } = this.state;
    const entityKey = Entity.create('image', 'IMMUTABLE', { src: imageUrlValue });

    this.setState({
      editorState: AtomicBlockUtils.insertAtomicBlock(
        editorState,
        entityKey,
        ' '
      ),
      imageUrlValue: ''
    }, () => {
      setTimeout(() => this.focus(), 0);
    })
  }

  _onImageURLInputKeyDown(e) {
    if(e.which === 13) {
      this._addImage(e);
    }
  }

  _toString() {
    const { editorState } = this.state;
    let contentState = editorState.getCurrentContent();
    console.log(stateToHTML(contentState));
  }

  render() {
    const { editorState } = this.state;
    let linkUrlInput;
    if(this.state.showLinkURLInput) {
      linkUrlInput =
        <div className="popover">
          <input
            onChange={this.onLinkURLChange}
            onBlur={this.cancelAddLink}
            ref="url"
            type="text"
            value={this.state.linkUrlValue}
            onKeyDown={this.onLinkInputKeyDown}
            className="urlInput"
          />
          <button onMouseDown={this.confirmLink}>
            Confirm
          </button>
          <button onMouseDown={this.cancelAddLink}>
            Cancel
          </button>
        </div>
    }
    return (
      <div className="root">
        <InlineStyleControls
          editorState={editorState}
          onToggle={this.toggleInlineStyle}
         />
         <BlockStyleControls
          editorState={editorState}
          onToggle={this.toggleBlockType}
        />
        <div className="controls">
          <button onMouseDown={this.promptForLink}>
            Add Link
          </button>
          {linkUrlInput}
          <button onMouseDown={this.removeLink}>
            RemoveLink
          </button>
        </div>
        <div className="controls">
          <button disabled={editorState.getUndoStack().isEmpty()} onClick={this.undo}>Undo</button>
          <button disabled={editorState.getRedoStack().isEmpty()} onClick={this.redo}>Redo</button>
        </div>
        <div>
          <input
            type="text"
            ref="image"
            onKeyDown={this.onImageURLInputKeyDown}
            onChange={this.onImageURLChange}
            value={this.state.imageUrlValue}
          />
          <button onClick={this.addImage}>Add Image</button>
        </div>
        <div className="editor" onClick={this.focus}>
          <Editor
            blockStyleFn={getBlockStyle}
            blockRendererFn={mediaBlockRenderer}
            editorState={editorState}
            onChange={this.onChange}
            handleKeyCommand={this.handleKeyCommand}
            ref="editor"
          />
        </div>
        <button onClick={this.logState}>logState</button>
        <button onClick={this.toString}>stateToHTML</button>
      </div>
    )
  }
}

function mediaBlockRenderer(block) {
  if (block.getType() === 'atomic') {
    return {
      component: Media,
      editable: false,
    };
  }

  return null;
}

const Audio = (props) => {
  return <audio controls src={props.src} style={styles.media} />;
};

const Image = (props) => {
  return <img src={props.src} width="100%" />;
};

const Video = (props) => {
  return <video controls src={props.src} style={styles.media} />;
};

const Media = (props) => {
  const entity = Entity.get(props.block.getEntityAt(0));
  const {src} = entity.getData();
  const type = entity.getType();

  let media;
  if (type === 'audio') {
    media = <Audio src={src} />;
  } else if (type === 'image') {
    media = <Image src={src} />;
  } else if (type === 'video') {
    media = <Video src={src} />;
  }

  return media;
};

function findLinkEntities(contentBlock, callback) {
  contentBlock.findEntityRanges(
    (character) => {
      const entityKey = character.getEntity();
      return (
        entityKey !== null &&
        Entity.get(entityKey).getType() === 'LINK'
      );
    },
    callback
  );
}

const Link = (props) => {
  const { url } = Entity.get(props.entityKey).getData();
  return (
    <a href={url} className="link">
      {props.children}
    </a>
  )
}

function getBlockStyle(block) {
  switch(block.getType()) {
    case 'blockquote': return 'blockquote';
    default: return null;
  }
}

class StyleButton extends Component {
  constructor() {
    super();
    this.onToggle = (e) => {
      e.preventDefault();
      this.props.onToggle(this.props.style);
    };
  }

  render() {
    return (
      <button className='style-button' onMouseDown={this.onToggle}>
        {this.props.text}
      </button>
    );
  }
}

const BLOCK_TYPES = [
  {text: 'UL', style: 'unordered-list-item'},
  {text: 'OL', style: 'ordered-list-item'},
  {text: 'Blockquote', style: 'blockquote'},
]

const BlockStyleControls = (props) => {
  const { editorState } = props;
  const selection = editorState.getSelection();
  const blockType = editorState
    .getCurrentContent()
    .getBlockForKey(selection.getStartKey())
    .getType();

    return (
      <div className="controls">
        {BLOCK_TYPES.map((type) =>
          <StyleButton
            key={type.text}
            active={type.style === blockType}
            text={type.text}
            onToggle={props.onToggle}
            style={type.style}
          />
        )}
      </div>
    )
}

const INLINE_STYLES = [
  {text: 'Bold', style: 'BOLD'},
  {text: 'Italic', style: 'ITALIC'},
  {text: 'Underline', style: 'UNDERLINE'},
];

const InlineStyleControls = (props) => {
  var currentStyle = props.editorState.getCurrentInlineStyle();
  return (
    <div className="controls">
      {INLINE_STYLES.map(type =>
        <StyleButton
          key={type.text}
          actice={currentStyle.has(type.style)}
          text={type.text}
          onToggle={props.onToggle}
          style={type.style}
        />
      )}
    </div>
  )
}

const styles = {
  media: {
    width: '100%',
  },
};

render(
  <MyEditor />,
  document.getElementById('app')
)
