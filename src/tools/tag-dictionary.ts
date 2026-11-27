export interface TagInfo {
  tag: string;
  name: string;
  category: 'Structure' | 'Text' | 'Interactive' | 'Media' | 'Lists & Tables' | 'Code & Meta';
  purpose: string;
  description: string;
  snippet: string;
  commonAttributes: string[];
  analogy?: string; // backwards compatibility
}

export const HTML_TAG_DICTIONARY: TagInfo[] = [
  // ==========================================
  // ✦ INTERACTIVE CONTROLS & FORMS
  // ==========================================
  {
    tag: 'button',
    name: 'Clickable Button',
    category: 'Interactive',
    purpose: 'Triggers actions, submits forms, or opens dialogs',
    description: 'A standard clickable button used to run JavaScript functions, submit form data, or open dialog modals. Always specify type="button" for custom scripts or type="submit" for forms.',
    snippet: '<button type="button" class="btn">\n  Click Me\n</button>',
    commonAttributes: ['type', 'disabled', 'name', 'value', 'onclick', 'class', 'id']
  },
  {
    tag: 'input',
    name: 'Form Input Field',
    category: 'Interactive',
    purpose: 'Collects text, numbers, passwords, checkboxes, or dates',
    description: 'The most versatile form control. Its behavior is defined by the type attribute: text, password, email, number, checkbox, radio, range, file, date, or color.',
    snippet: '<input type="text" id="username" name="username" placeholder="Enter your name" required>',
    commonAttributes: ['type', 'name', 'value', 'placeholder', 'required', 'disabled', 'id']
  },
  {
    tag: 'label',
    name: 'Input Label',
    category: 'Interactive',
    purpose: 'Clickable caption connected to an input field',
    description: 'Provides a readable caption for an input control. When a user clicks the label text, the browser automatically focuses or toggles the linked input. Connect them using the "for" attribute matching the input\'s "id".',
    snippet: '<label for="email-field">Email Address</label>\n<input type="email" id="email-field" placeholder="you@example.com">',
    commonAttributes: ['for', 'class', 'id']
  },
  {
    tag: 'textarea',
    name: 'Multi-line Text Area',
    category: 'Interactive',
    purpose: 'Collects multi-line text, comments, or notes',
    description: 'An expandable multi-line text input field, ideal for comments, messages, descriptions, or code notes where users need multiple lines of text.',
    snippet: '<textarea rows="4" cols="40" placeholder="Type your notes or feedback here..."></textarea>',
    commonAttributes: ['rows', 'cols', 'placeholder', 'maxlength', 'required', 'disabled', 'id']
  },
  {
    tag: 'select',
    name: 'Dropdown Select Menu',
    category: 'Interactive',
    purpose: 'Dropdown menu for picking one or more options',
    description: 'A dropdown menu allowing users to select an option from a list. Contains child <option> elements for each selectable item.',
    snippet: '<select id="color-select" name="color">\n  <option value="blue">Blue</option>\n  <option value="green">Green</option>\n  <option value="amber">Amber</option>\n</select>',
    commonAttributes: ['name', 'id', 'required', 'disabled', 'multiple', 'size']
  },
  {
    tag: 'option',
    name: 'Select Option Item',
    category: 'Interactive',
    purpose: 'A single choice inside a dropdown menu',
    description: 'Defines a single selectable choice inside a <select>, <optgroup>, or <datalist> dropdown.',
    snippet: '<option value="standard" selected>Standard Edition</option>',
    commonAttributes: ['value', 'selected', 'disabled']
  },
  {
    tag: 'optgroup',
    name: 'Option Group',
    category: 'Interactive',
    purpose: 'Groups related options inside a dropdown with a header',
    description: 'Groups related choices inside a <select> dropdown under a non-selectable bold category label.',
    snippet: '<optgroup label="Theme Options">\n  <option value="dark">Dark Theme</option>\n  <option value="light">Light Theme</option>\n</optgroup>',
    commonAttributes: ['label', 'disabled']
  },
  {
    tag: 'form',
    name: 'Form Container',
    category: 'Interactive',
    purpose: 'Groups inputs and buttons to submit data',
    description: 'Wraps interactive form controls (inputs, checkboxes, selects, buttons) to be submitted together to a server or captured with a JavaScript submit handler.',
    snippet: '<form action="/submit" method="post">\n  <label for="name">Name:</label>\n  <input type="text" id="name" required>\n  <button type="submit">Submit</button>\n</form>',
    commonAttributes: ['action', 'method', 'target', 'onsubmit', 'autocomplete', 'id']
  },
  {
    tag: 'fieldset',
    name: 'Form Fieldset Box',
    category: 'Interactive',
    purpose: 'Visual border grouping related controls together',
    description: 'Draws a container box around related form controls to improve layout and accessibility, typically titled with a <legend>.',
    snippet: '<fieldset>\n  <legend>Preferences</legend>\n  <label><input type="checkbox" name="sound" checked> Enable Audio</label>\n</fieldset>',
    commonAttributes: ['disabled', 'form', 'name', 'class', 'id']
  },
  {
    tag: 'legend',
    name: 'Fieldset Caption',
    category: 'Interactive',
    purpose: 'Title caption displayed on a fieldset border',
    description: 'The caption or title for the parent <fieldset> element, rendered embedded right along the top border line.',
    snippet: '<legend>Account Settings</legend>',
    commonAttributes: ['class', 'id']
  },
  {
    tag: 'a',
    name: 'Hyperlink Anchor',
    category: 'Interactive',
    purpose: 'Navigates to another page, file download, or section',
    description: 'Creates a clickable link to another webpage, internal section anchor (#section), email link (mailto:), or file download.',
    snippet: '<a href="https://example.com" target="_blank" rel="noopener">Visit Website</a>',
    commonAttributes: ['href', 'target', 'rel', 'download', 'title', 'class']
  },
  {
    tag: 'details',
    name: 'Collapsible Accordion',
    category: 'Interactive',
    purpose: 'Expandable box that shows or hides extra content',
    description: 'A native interactive accordion widget that users can click to toggle between open and closed states without needing any JavaScript.',
    snippet: '<details>\n  <summary>Click to view system specs</summary>\n  <p>Memory: 16 GB DDR5</p>\n  <p>Graphics: Vulkan / WebGL</p>\n</details>',
    commonAttributes: ['open', 'class', 'id']
  },
  {
    tag: 'summary',
    name: 'Accordion Summary Header',
    category: 'Interactive',
    purpose: 'Clickable title that toggles a details accordion',
    description: 'The visible clickable header for a <details> collapsible block. Clicking it reveals or hides the contents inside <details>.',
    snippet: '<summary>Frequently Asked Questions</summary>',
    commonAttributes: ['class', 'id']
  },
  {
    tag: 'dialog',
    name: 'Pop-up Modal Dialog',
    category: 'Interactive',
    purpose: 'Pop-up window or modal dialog box',
    description: 'A native browser modal dialog sheet with built-in backdrop dimming. Opened with JavaScript dialog.showModal() or dialog.show(), and closed with dialog.close().',
    snippet: '<dialog id="alert-box">\n  <h3>Action Confirmed</h3>\n  <p>Your settings have been saved.</p>\n  <button onclick="this.closest(\'dialog\').close()">OK</button>\n</dialog>',
    commonAttributes: ['open', 'id', 'class']
  },
  {
    tag: 'progress',
    name: 'Progress Bar',
    category: 'Interactive',
    purpose: 'Visual bar showing task or download progress',
    description: 'Displays a native browser progress bar indicating task completion percentage from 0 to 100 or fractional amount.',
    snippet: '<label for="task-progress">Task Progress:</label>\n<progress id="task-progress" value="70" max="100">70%</progress>',
    commonAttributes: ['value', 'max', 'id', 'class']
  },
  {
    tag: 'meter',
    name: 'Measurement Gauge',
    category: 'Interactive',
    purpose: 'Visual gauge for values within a known range',
    description: 'Displays a scalar gauge measurement within a fixed minimum and maximum, such as disk storage used, battery level, or test scores.',
    snippet: '<label for="disk-meter">Disk Usage:</label>\n<meter id="disk-meter" min="0" max="100" low="70" high="90" optimum="50" value="78">78%</meter>',
    commonAttributes: ['value', 'min', 'max', 'low', 'high', 'optimum', 'id']
  },
  {
    tag: 'datalist',
    name: 'Input Auto-complete List',
    category: 'Interactive',
    purpose: 'Dropdown suggestions for a text input',
    description: 'Provides a list of recommended auto-complete options for an <input> field while still allowing users to type custom text.',
    snippet: '<input list="browsers" name="browser" placeholder="Choose a browser">\n<datalist id="browsers">\n  <option value="Chrome">\n  <option value="Firefox">\n  <option value="Safari">\n  <option value="Edge">\n</datalist>',
    commonAttributes: ['id']
  },
  {
    tag: 'output',
    name: 'Calculation Output',
    category: 'Interactive',
    purpose: 'Displays the result of a user calculation or script',
    description: 'Represents the visible outcome of a calculation, such as values adjusted by a slider or form formula.',
    snippet: '<input type="range" id="volume" oninput="out.value=this.value">\n<output id="out" for="volume">50</output>',
    commonAttributes: ['for', 'name', 'id', 'class']
  },
  {
    tag: 'menu',
    name: 'Action Menu Toolbar',
    category: 'Interactive',
    purpose: 'Semantic list of buttons or interactive commands',
    description: 'A semantic container for a toolbar of interactive action buttons or commands.',
    snippet: '<menu>\n  <li><button type="button">Copy</button></li>\n  <li><button type="button">Paste</button></li>\n</menu>',
    commonAttributes: ['class', 'id']
  },

  // ==========================================
  // ✦ TEXT & TYPOGRAPHY
  // ==========================================
  {
    tag: 'h1',
    name: 'Heading 1 (Main Title)',
    category: 'Text',
    purpose: 'Primary document title (largest heading)',
    description: 'The most important heading on the page. Best practice is to use only one <h1> per page for the main title.',
    snippet: '<h1>Page Title</h1>',
    commonAttributes: ['class', 'id', 'style']
  },
  {
    tag: 'h2',
    name: 'Heading 2 (Section Title)',
    category: 'Text',
    purpose: 'Major section heading',
    description: 'Secondary heading used to title major sections within your webpage or document.',
    snippet: '<h2>Section Title</h2>',
    commonAttributes: ['class', 'id', 'style']
  },
  {
    tag: 'h3',
    name: 'Heading 3 (Sub-section Title)',
    category: 'Text',
    purpose: 'Sub-section heading under an H2',
    description: 'Tertiary heading dividing an H2 section into smaller sub-topics.',
    snippet: '<h3>Sub-section Title</h3>',
    commonAttributes: ['class', 'id', 'style']
  },
  {
    tag: 'h4',
    name: 'Heading 4 (Minor Sub-heading)',
    category: 'Text',
    purpose: 'Fourth-level heading for nested details',
    description: 'Sub-heading under an H3, used for cards, widgets, or detailed feature points.',
    snippet: '<h4>Detail Item</h4>',
    commonAttributes: ['class', 'id']
  },
  {
    tag: 'p',
    name: 'Paragraph',
    category: 'Text',
    purpose: 'Block of regular body text',
    description: 'The fundamental block element for prose, narrative, paragraphs, and descriptions.',
    snippet: '<p>This is a standard paragraph of descriptive text.</p>',
    commonAttributes: ['class', 'id', 'style']
  },
  {
    tag: 'span',
    name: 'Inline Text Span',
    category: 'Text',
    purpose: 'Inline container for styling specific words or text',
    description: 'A generic inline wrapper with no default appearance. Used to color, highlight, or font-style specific words within a paragraph.',
    snippet: '<span style="color: #c56bff; font-weight: bold;">Highlighted Text</span>',
    commonAttributes: ['class', 'id', 'style']
  },
  {
    tag: 'strong',
    name: 'Strong Importance (Bold)',
    category: 'Text',
    purpose: 'Bold text indicating high importance or urgency',
    description: 'Renders text in bold and signals to screen readers and browsers that the text has serious importance or urgency.',
    snippet: '<strong>Important Warning:</strong> Save your progress.',
    commonAttributes: ['class']
  },
  {
    tag: 'em',
    name: 'Emphasized Text (Italic)',
    category: 'Text',
    purpose: 'Italic text indicating vocal stress or emphasis',
    description: 'Renders text in italic to indicate subtle emphasis, vocal stress, or an alternate tone of voice.',
    snippet: '<em>Always</em> test your layout on mobile.',
    commonAttributes: ['class']
  },
  {
    tag: 'b',
    name: 'Stylistic Bold',
    category: 'Text',
    purpose: 'Draws attention without implying extra importance',
    description: 'Makes text bold purely for visual style (such as product names, key phrases) without conveying structural urgency.',
    snippet: '<b>Product Name</b>',
    commonAttributes: ['class']
  },
  {
    tag: 'i',
    name: 'Stylistic Italic / Icon',
    category: 'Text',
    purpose: 'Italic text for technical terms, idioms, or icon fonts',
    description: 'Renders text in italics for idiomatic expressions, foreign terms, or commonly used as a holder for vector icon fonts.',
    snippet: '<i class="icon"></i> <i>Latin term</i>',
    commonAttributes: ['class']
  },
  {
    tag: 'u',
    name: 'Underlined Text',
    category: 'Text',
    purpose: 'Underlines text for spelling errors or annotations',
    description: 'Draws a solid underline beneath text. Use sparingly to avoid confusion with clickable hyperlinks.',
    snippet: '<u>Underlined phrase</u>',
    commonAttributes: ['class']
  },
  {
    tag: 's',
    name: 'Strikethrough Text',
    category: 'Text',
    purpose: 'Crossed-out text indicating obsolete or deleted info',
    description: 'Renders a line through text to show that something is no longer accurate, out of stock, or completed.',
    snippet: '<s>Old Price: $50</s> Now: $30',
    commonAttributes: ['class']
  },
  {
    tag: 'mark',
    name: 'Highlighted Text',
    category: 'Text',
    purpose: 'Yellow or highlighted text for search results or callouts',
    description: 'Renders text with a colored highlight background (default yellow) to signify relevance in search results or key references.',
    snippet: '<mark>search keyword</mark>',
    commonAttributes: ['class']
  },
  {
    tag: 'small',
    name: 'Small Print / Note',
    category: 'Text',
    purpose: 'Smaller text for copyright, disclaimers, or side notes',
    description: 'Renders text one font size smaller, ideal for disclaimers, legal notices, copyright lines, or secondary attribution.',
    snippet: '<small>© 2026 Interstatus Lab. All rights reserved.</small>',
    commonAttributes: ['class']
  },
  {
    tag: 'code',
    name: 'Inline Code',
    category: 'Text',
    purpose: 'Monospace font for programming code or keyboard keys',
    description: 'Formats inline text in a monospace font to represent snippets of code, terminal commands, or variable names.',
    snippet: '<code>git status</code>',
    commonAttributes: ['class']
  },
  {
    tag: 'pre',
    name: 'Preformatted Text Block',
    category: 'Text',
    purpose: 'Preserves exact spaces, tabs, and line breaks',
    description: 'Renders text exactly as typed in the HTML source code, retaining all spaces, tabs, and newlines. Frequently paired with <code> for code blocks.',
    snippet: '<pre><code>function greet() {\n  console.log("Hello, World!");\n}</code></pre>', // slop-ok: example code shown to the user
    commonAttributes: ['class']
  },
  {
    tag: 'blockquote',
    name: 'Blockquote',
    category: 'Text',
    purpose: 'Indented quotation block from an external source',
    description: 'Indicates a section quoted from another source, book, or speaker, typically styled with an indented border on the left.',
    snippet: '<blockquote cite="https://example.com">\n  "Simplicity is the soul of efficiency."\n</blockquote>',
    commonAttributes: ['cite', 'class']
  },
  {
    tag: 'hr',
    name: 'Horizontal Divider Line',
    category: 'Text',
    purpose: 'Visual thematic divider line between sections',
    description: 'Draws a horizontal rule line across the container to represent a thematic break or transition between topics.',
    snippet: '<hr>',
    commonAttributes: ['class', 'style']
  },
  {
    tag: 'br',
    name: 'Line Break',
    category: 'Text',
    purpose: 'Forces text onto a new line without a new paragraph',
    description: 'Inserts a single line break in text without adding extra paragraph margin. Useful for street addresses or poetry.',
    snippet: 'First Line<br>Second Line',
    commonAttributes: []
  },

  // ==========================================
  // ✦ STRUCTURE & LAYOUT
  // ==========================================
  {
    tag: 'div',
    name: 'Generic Container Box',
    category: 'Structure',
    purpose: 'Flexible container block for layouts, flexbox, and grid',
    description: 'A generic block container used to group elements together for positioning, layouts (flex/grid), and styling without adding semantic meaning.',
    snippet: '<div class="card">\n  <h2>Title</h2>\n  <p>Content goes here.</p>\n</div>',
    commonAttributes: ['class', 'id', 'style']
  },
  {
    tag: 'section',
    name: 'Thematic Section',
    category: 'Structure',
    purpose: 'Self-contained section of content grouped under a heading',
    description: 'Represents a standalone thematic portion of a page, such as a feature showcase, testimonial block, or chapter.',
    snippet: '<section class="features">\n  <h2>Key Features</h2>\n  <p>Feature details...</p>\n</section>',
    commonAttributes: ['class', 'id']
  },
  {
    tag: 'header',
    name: 'Page / Section Header',
    category: 'Structure',
    purpose: 'Introductory top banner with titles, branding, and navigation',
    description: 'Contains introductory content, site titles, branding, and top navigational landmarks for a page or article.',
    snippet: '<header>\n  <h1>Website Title</h1>\n  <nav><!-- Links --></nav>\n</header>',
    commonAttributes: ['class', 'id']
  },
  {
    tag: 'nav',
    name: 'Navigation Bar',
    category: 'Structure',
    purpose: 'Container for primary website navigation links',
    description: 'Designates a section containing primary navigation links or menus across your project.',
    snippet: '<nav>\n  <a href="#home">Home</a>\n  <a href="#about">About</a>\n  <a href="#contact">Contact</a>\n</nav>',
    commonAttributes: ['class', 'aria-label', 'id']
  },
  {
    tag: 'main',
    name: 'Main Content Area',
    category: 'Structure',
    purpose: 'Central unique content of the page (only one per document)',
    description: 'Encloses the primary, unique content of the document. Each HTML page should have only one <main> element.',
    snippet: '<main>\n  <h1>Today\'s Mission</h1>\n  <p>Core content...</p>\n</main>',
    commonAttributes: ['class', 'id']
  },
  {
    tag: 'footer',
    name: 'Page / Section Footer',
    category: 'Structure',
    purpose: 'Concluding bottom area for copyright, links, and contact info',
    description: 'Displays concluding info like copyright notices, legal disclaimers, credits, and secondary sitemap links.',
    snippet: '<footer>\n  <p>© 2026 Interstatus Lab. All rights reserved.</p>\n</footer>',
    commonAttributes: ['class', 'id']
  },
  {
    tag: 'article',
    name: 'Self-Contained Article / Card',
    category: 'Structure',
    purpose: 'Independent piece of content like a blog post or product card',
    description: 'A self-contained piece of content intended to be independently distributable (e.g., blog post, news story, product card).',
    snippet: '<article class="card">\n  <h2>Card Title</h2>\n  <p>Card description...</p>\n</article>',
    commonAttributes: ['class', 'id']
  },
  {
    tag: 'aside',
    name: 'Sidebar / Callout Box',
    category: 'Structure',
    purpose: 'Side panel or callout with related secondary information',
    description: 'Holds indirectly related or complementary information, such as sidebars, quick notes, callout boxes, or author bios.',
    snippet: '<aside class="sidebar">\n  <h3>Quick Info</h3>\n  <p>Secondary notes...</p>\n</aside>',
    commonAttributes: ['class', 'id']
  },

  // ==========================================
  // ✦ LISTS & TABLES
  // ==========================================
  {
    tag: 'ul',
    name: 'Unordered (Bulleted) List',
    category: 'Lists & Tables',
    purpose: 'Bullet-point list where order does not matter',
    description: 'A collection of items marked with bullet points where the numerical sequence does not matter.',
    snippet: '<ul>\n  <li>Item One</li>\n  <li>Item Two</li>\n  <li>Item Three</li>\n</ul>',
    commonAttributes: ['class', 'id']
  },
  {
    tag: 'ol',
    name: 'Ordered (Numbered) List',
    category: 'Lists & Tables',
    purpose: 'Numbered list where sequence or order matters',
    description: 'A collection of items displayed with sequential numbers (1, 2, 3), letters, or roman numerals.',
    snippet: '<ol>\n  <li>First step</li>\n  <li>Second step</li>\n  <li>Third step</li>\n</ol>',
    commonAttributes: ['start', 'type', 'reversed', 'class']
  },
  {
    tag: 'li',
    name: 'List Item',
    category: 'Lists & Tables',
    purpose: 'Individual item inside a <ul> or <ol> list',
    description: 'Represents a single item inside an unordered (bulleted) or ordered (numbered) list.',
    snippet: '<li>List item content</li>',
    commonAttributes: ['class', 'value']
  },
  {
    tag: 'dl',
    name: 'Description List',
    category: 'Lists & Tables',
    purpose: 'Glossary or key-value list of terms and descriptions',
    description: 'Wraps a list of term-description pairs (like a dictionary, glossary, or metadata key-value list).',
    snippet: '<dl>\n  <dt>HTML</dt>\n  <dd>HyperText Markup Language</dd>\n  <dt>CSS</dt>\n  <dd>Cascading Style Sheets</dd>\n</dl>',
    commonAttributes: ['class', 'id']
  },
  {
    tag: 'dt',
    name: 'Description Term',
    category: 'Lists & Tables',
    purpose: 'The name or term being defined in a description list',
    description: 'Specifies a term, title, or key inside a description list (<dl>).',
    snippet: '<dt>Term Name</dt>',
    commonAttributes: ['class']
  },
  {
    tag: 'dd',
    name: 'Description Definition',
    category: 'Lists & Tables',
    purpose: 'The definition or value for a description term',
    description: 'Specifies the description, definition, or value corresponding to the preceding <dt> term.',
    snippet: '<dd>Explanation or definition value.</dd>',
    commonAttributes: ['class']
  },
  {
    tag: 'table',
    name: 'Data Table',
    category: 'Lists & Tables',
    purpose: 'Table container for tabular data with rows and columns',
    description: 'Displays two-dimensional tabular data arranged in rows (<tr>), headers (<th>), and data cells (<td>).',
    snippet: '<table>\n  <thead>\n    <tr><th>Item</th><th>Price</th></tr>\n  </thead>\n  <tbody>\n    <tr><td>Coffee</td><td>$4.00</td></tr>\n  </tbody>\n</table>',
    commonAttributes: ['class', 'id']
  },
  {
    tag: 'thead',
    name: 'Table Header Group',
    category: 'Lists & Tables',
    purpose: 'Groups header rows at the top of a table',
    description: 'Encloses the header row or rows (<tr>) that define the column titles of a table.',
    snippet: '<thead>\n  <tr><th>Column 1</th><th>Column 2</th></tr>\n</thead>',
    commonAttributes: ['class']
  },
  {
    tag: 'tbody',
    name: 'Table Body Group',
    category: 'Lists & Tables',
    purpose: 'Groups data rows in the body of a table',
    description: 'Encloses the main body rows (<tr>) containing the actual data records of a table.',
    snippet: '<tbody>\n  <tr><td>Data A</td><td>Data B</td></tr>\n</tbody>',
    commonAttributes: ['class']
  },
  {
    tag: 'tr',
    name: 'Table Row',
    category: 'Lists & Tables',
    purpose: 'Horizontal row of cells inside a table',
    description: 'Defines a single horizontal row containing header cells (<th>) or data cells (<td>).',
    snippet: '<tr>\n  <td>Cell 1</td>\n  <td>Cell 2</td>\n</tr>',
    commonAttributes: ['class']
  },
  {
    tag: 'th',
    name: 'Table Header Cell',
    category: 'Lists & Tables',
    purpose: 'Bold, centered header label for a column or row',
    description: 'A table cell representing a column or row header. Rendered bold and centered by default.',
    snippet: '<th scope="col">Header Title</th>',
    commonAttributes: ['scope', 'colspan', 'rowspan', 'class']
  },
  {
    tag: 'td',
    name: 'Table Data Cell',
    category: 'Lists & Tables',
    purpose: 'Standard data cell containing text or numbers',
    description: 'A standard table cell containing data, numbers, or text within a table row.',
    snippet: '<td>Data Content</td>',
    commonAttributes: ['colspan', 'rowspan', 'class']
  },

  // ==========================================
  // ✦ MEDIA & EMBEDDED
  // ==========================================
  {
    tag: 'img',
    name: 'Image',
    category: 'Media',
    purpose: 'Embeds a photo, graphic, or icon',
    description: 'Embeds an external raster image (PNG, JPG, WebP) or vector graphic (SVG) into your document. Always supply an alt description for accessibility.',
    snippet: '<img src="https://picsum.photos/400/250" alt="Scenic Landscape" class="rounded">',
    commonAttributes: ['src', 'alt', 'width', 'height', 'loading', 'class']
  },
  {
    tag: 'video',
    name: 'Video Player',
    category: 'Media',
    purpose: 'Plays video files with native controls and captions',
    description: 'Native media player supporting MP4 and WebM formats, playback controls, autoplay, and subtitles.',
    snippet: '<video controls width="480">\n  <source src="movie.mp4" type="video/mp4">\n  Your browser does not support the video tag.\n</video>',
    commonAttributes: ['src', 'controls', 'autoplay', 'muted', 'loop', 'poster', 'width', 'height']
  },
  {
    tag: 'audio',
    name: 'Audio Player',
    category: 'Media',
    purpose: 'Plays sound or music tracks with native audio controls',
    description: 'Native sound player for MP3, WAV, or OGG audio files with play/pause and volume controls.',
    snippet: '<audio controls>\n  <source src="sound.mp3" type="audio/mpeg">\n</audio>',
    commonAttributes: ['src', 'controls', 'autoplay', 'loop', 'muted']
  },
  {
    tag: 'canvas',
    name: 'Drawing Canvas',
    category: 'Media',
    purpose: 'Scriptable drawing area for 2D/3D graphics, games, and charts',
    description: 'A scriptable bitmap arena for rendering dynamic 2D graphics, particles, games, and procedural charts via JavaScript.',
    snippet: '<canvas id="gameCanvas" width="400" height="300"></canvas>',
    commonAttributes: ['id', 'width', 'height', 'class']
  },
  {
    tag: 'iframe',
    name: 'Inline Frame (Embed)',
    category: 'Media',
    purpose: 'Embeds another webpage or video (YouTube, Maps, widgets)',
    description: 'Embeds an independent nested browsing context (another HTML page, video embed, or interactive map) into the current page.',
    snippet: '<iframe src="https://example.com" width="600" height="400" title="Embedded Content"></iframe>',
    commonAttributes: ['src', 'title', 'width', 'height', 'loading', 'allowfullscreen']
  },

  // ==========================================
  // ✦ CODE & DOCUMENT METADATA
  // ==========================================
  {
    tag: 'html',
    name: 'HTML Root Element',
    category: 'Code & Meta',
    purpose: 'Root container wrapping the entire document',
    description: 'The top-level root element containing all other elements on the page. Specifies the page language with lang="en".',
    snippet: '<!DOCTYPE html>\n<html lang="en">\n  <head>...</head>\n  <body>...</body>\n</html>',
    commonAttributes: ['lang', 'data-theme']
  },
  {
    tag: 'head',
    name: 'Document Head',
    category: 'Code & Meta',
    purpose: 'Contains metadata, stylesheets, title, and fonts (invisible)',
    description: 'Container for non-visible page configuration including character encoding, page title, stylesheets, fonts, and scripts.',
    snippet: '<head>\n  <meta charset="UTF-8">\n  <title>Page Title</title>\n</head>',
    commonAttributes: []
  },
  {
    tag: 'title',
    name: 'Document Title',
    category: 'Code & Meta',
    purpose: 'Page title displayed on the browser tab',
    description: 'Defines the title of the document shown in the browser\'s title bar, tab, and search engine results.',
    snippet: '<title>My Web Page</title>',
    commonAttributes: []
  },
  {
    tag: 'meta',
    name: 'Metadata Tag',
    category: 'Code & Meta',
    purpose: 'Declares character encoding, mobile viewport, or SEO info',
    description: 'Provides machine-readable data about the HTML document, such as character set (UTF-8), responsive viewport scaling, or descriptions for SEO.',
    snippet: '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    commonAttributes: ['name', 'content', 'charset', 'http-equiv']
  },
  {
    tag: 'link',
    name: 'External Resource Link',
    category: 'Code & Meta',
    purpose: 'Links external CSS stylesheets, fonts, and icons',
    description: 'Establishes a link to external resources, most commonly CSS stylesheets, web fonts, or website favicons.',
    snippet: '<link rel="stylesheet" href="style.css">',
    commonAttributes: ['rel', 'href', 'type', 'crossorigin']
  },
  {
    tag: 'style',
    name: 'Internal CSS Stylesheet',
    category: 'Code & Meta',
    purpose: 'Block of custom CSS styling rules',
    description: 'Contains CSS rules that style HTML elements within the document without needing an external .css file.',
    snippet: '<style>\n  body {\n    font-family: sans-serif;\n    margin: 0;\n  }\n</style>',
    commonAttributes: ['type']
  },
  {
    tag: 'script',
    name: 'JavaScript Code / Link',
    category: 'Code & Meta',
    purpose: 'Runs client-side JavaScript code or links an external .js file',
    description: 'Contains executable client-side JavaScript code or points to an external script file via src="...".',
    snippet: '<script>\n  console.log("Hello from ScryPad!");\n</script>', // slop-ok: example code shown to the user
    commonAttributes: ['src', 'type', 'defer', 'async']
  }
];

export function findTagInfo(tag: string): TagInfo | undefined {
  const cleanTag = tag.toLowerCase().replace(/[<>]/g, '').trim();
  const direct = HTML_TAG_DICTIONARY.find(t => t.tag === cleanTag);
  if (direct) return direct;

  // Handle heading variations
  if (/^h[1-6]$/.test(cleanTag)) {
    return HTML_TAG_DICTIONARY.find(t => t.tag === cleanTag) || HTML_TAG_DICTIONARY.find(t => t.tag === 'h1');
  }
  return undefined;
}
