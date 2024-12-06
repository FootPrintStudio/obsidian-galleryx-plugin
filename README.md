# GalleryX Plugin for Obsidian

GalleryX is a gallery plugin for Obsidian that creates elegant gallery layouts with fullscreen viewing functionality.

> [!caution] Disclaimer
> This plugin is developed by "brute force", using Tabnine AI. I have no proficiency with coding and therefore will be very limited in what i can do to address feature requests and fixes. Ultimately this plugin was developed for my needs and it works for that; however, contributions are more than welcome, if you see greater potential for the plugin and want to tackle it go for it.

## Features

- Parse lines of image links into a gallery view
- Support for local images and videos
- Inline single image/video display
- Fullscreen viewing
    - Zooming
    - Dragging around
- Tagging system
    - Gallery filtering via tags.
- Global image search

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
flexboxheight: 300px
https://example.com/image1.jpg {tag1, tag2}
https://example.com/image2.jpg {tag3}
![[local_image.png]] {tag4}
```
````
````
```galleryx
settings: grid
columns: 6
https://example.com/image1.jpg {tag1, tag2}
https://example.com/image2.jpg {tag3}
![[local_image.png]] {tag4}
```
````

For inline single images or videos:

```
`galleryx-single:https://example.com/image.jpg {tag1, tag2}`
```

Use the `gallery-search` code block to create search blocks:

````
```gallery-search
tags: (can be empty)
Limit: 50 (limit per page)
```
````

## Development

1. Clone this repo
2. `npm i` or `yarn` to install dependencies
3. `npm run dev` to start compilation in watch mode

## License

[MIT License](LICENSE.txt)
