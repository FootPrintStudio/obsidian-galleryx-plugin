# GalleryX Plugin for Obsidian

GalleryX is a gallery plugin for Obsidian that creates elegant gallery layouts with fullscreen viewing functionality.

## Features

- Parse lines of image links into a gallery view
- Support for local images and videos
- Inline single image/video display
- Fullscreen viewing (coming soon)
- Tagging system (coming soon)

## Installation

1. Download the latest release from the GitHub releases page
2. Extract the plugin folder into your `.obsidian/plugins/` directory
3. Reload Obsidian
4. Enable the plugin in Settings > Community Plugins

## Usage

Use the `galleryx` code block to create galleries:

````
```galleryx
settings: flexbox
https://example.com/image1.jpg {tag1, tag2}
https://example.com/image2.jpg {tag3}
![[local_image.png]] {tag4}
```
````

For inline single images or videos:

```
`galleryx-single:https://example.com/image.jpg {tag1, tag2}`
```

## Development

1. Clone this repo
2. `npm i` or `yarn` to install dependencies
3. `npm run dev` to start compilation in watch mode

## License

[MIT License](LICENSE.txt)
