// Plasmic component registrations — applied to BOTH client loaders
// (published + preview) so Studio canvas and preview URLs see the same
// component metadata.
//
// Every registered component lives under components/plasmic/<name>/.
// Server queries ($q) are ALSO registered on the server loaders in
// lib/plasmic/server-registrations.ts.
//
// Never rename a registration `name` — published pages resolve components by
// that name from the bundle.
import { PLASMIC, PREVIEW_PLASMIC } from '@/lib/plasmic/init-client';
import SliderCarousel, {
  sliderCarouselHelpers,
} from '@/components/plasmic/slider-carousel';
import {
  appendSlide,
  CurrentSlideDropdown,
  deleteCurrentSlide,
  isSlotForwarded,
  NavigateSlides,
  OutlineMessage,
} from '@/components/plasmic/slider-carousel/slider-carousel.actions';
import StickyWrapper from '@/components/plasmic/sticky-wrapper';
import TooltipWrapper from '@/components/plasmic/tooltip-wrapper';
import CustomScrollbar from '@/components/plasmic/custom-scrollbar';
import ModalWrapper from '@/components/plasmic/modal';
import AccordionContainer, {
  AccordionButton,
  AccordionContent,
} from '@/components/plasmic/accordion';
import FormContainer from '@/components/plasmic/form/form-container';
import FormField from '@/components/plasmic/form/form-field';
import TextInput from '@/components/plasmic/form/text-input';
import SelectInput from '@/components/plasmic/form/select-input';
import CheckboxInput from '@/components/plasmic/form/checkbox-input';
import RadioGroupInput from '@/components/plasmic/form/radio-group-input';
import CheckboxGroupInput from '@/components/plasmic/form/checkbox-group-input';
import ComboboxInput from '@/components/plasmic/form/combobox-input';
import DatePickerInput from '@/components/plasmic/form/date-picker-input';
import TabsContainer, {
  TabButton,
  TabContent,
  TabUnderline,
} from '@/components/plasmic/tabs';
import SelectionProvider, {
  SelectionItem,
} from '@/components/plasmic/selection';
import { getPosts, getPostsMeta } from '@/lib/plasmic/data/posts';

type Loader = NonNullable<typeof PLASMIC>;

// Server queries ($q). Plasmic executes them in RSC and ships the result in
// the HTML; this client registration serves the Studio canvas and
// client-side navigation.
function registerFunctions(loader: Loader) {
  loader.registerFunction(getPosts, getPostsMeta);
}

function registerComponents(loader: Loader) {
  loader.registerComponent(StickyWrapper, {
    name: 'StickyWrapper',
    displayName: 'Sticky Wrapper',
    importPath: '@/components/plasmic/sticky-wrapper',
    providesData: true,
    defaultStyles: {
      width: '100%',
    },
    props: {
      children: {
        type: 'slot',
        defaultValue: [],
      },
      topOffset: {
        type: 'number',
        defaultValue: 0,
        description:
          'Distance from viewport top when stuck (px). Replaces CSS `top:` value on your former sticky element.',
      },
      topMargin: {
        type: 'number',
        defaultValue: 0,
        description:
          'CSS margin-top applied while NOT stuck (px). Use negative values to overlay into the element above. Ignored when stuck.',
      },
      disabled: {
        type: 'boolean',
        defaultValue: false,
        description:
          'When true, disables sticky behavior — content renders in normal flow, scroll listener is skipped, $ctx.isIntersected stays false. Useful for per-breakpoint disable via responsive variants.',
      },
    },
  });

  // SliderCarousel — Swiper-based Plasmic code component. All slider
  // controls (dots, scrollbar, autoplay, effects, gap, edge inset) map
  // to native Swiper modules.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loader.registerComponent(SliderCarousel as any, {
    name: 'SliderCarousel',
    displayName: 'Slider Carousel',
    importPath: '@/components/plasmic/slider-carousel',
    actions: [
      {
        type: 'custom-action',
        control: CurrentSlideDropdown,
      },
      {
        type: 'custom-action',
        control: NavigateSlides,
      },
      {
        type: 'button-action',
        label: 'Append new slide',
        // Hide when slides come from a forwarded slot — studioOps can only
        // manipulate the code component's own 'children' slot; forwarded
        // content lives in the wrapper's slot which we can't reach.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hidden: (ps: any) => isSlotForwarded(ps.children),
        onClick: appendSlide,
      },
      {
        type: 'button-action',
        label: 'Delete current slide',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hidden: (ps: any) =>
          (ps.children as any)?.type?.name === 'CanvasSlotPlaceholder' ||
          isSlotForwarded(ps.children),
        onClick: deleteCurrentSlide,
      },
      {
        type: 'custom-action',
        control: OutlineMessage,
      },
    ],
    refActions: {
      slickGoTo: {
        displayName: 'Go to slide',
        argTypes: [
          { name: 'index', displayName: 'Slide index', type: 'number' },
          { name: 'dontAnimate', displayName: 'Animate?', type: 'boolean' },
        ],
      },
      slickNext: {
        displayName: 'Go to Next slide',
        argTypes: [],
      },
      slickPause: {
        displayName: 'Pause',
        argTypes: [],
      },
      slickPlay: {
        displayName: 'Play',
        argTypes: [],
      },
      slickPrev: {
        displayName: 'Go to Previous slide',
        argTypes: [],
      },
    },
    props: {
      children: {
        type: 'slot',
        isRepeated: true,
        defaultValue: [0, 1, 2].map(i => ({
          type: 'vbox' as const,
          children: {
            type: 'img' as const,
            src: `https://static1.plasmic.app/components/react-slick/slide${
              i + 1
            }.png`,
            styles: {
              maxWidth: '100%',
            },
          },
        })),
      },
      initialSlide: {
        displayName: 'Initial Slide',
        type: 'number',
        description: 'Index of the first visible slide (first is 0)',
        defaultValueHint: 0,
        defaultValue: 0,
      },
      titleSlide: {
        displayName: 'Title slide',
        type: 'number',
        description: 'Index of slide to display above the carousel.',
      },
      slidesGap: {
        displayName: 'Slides gap',
        type: 'number',
        description: 'Visual gap between adjacent slides.',
      },
      slidesOffset: {
        displayName: 'Slides offset',
        type: 'number',
        description:
          'Padding on the leading edge of first slide + trailing edge of last slide.',
      },
      slidesToScroll: {
        advanced: true,
        displayName: 'Slides To Scroll',
        type: 'number',
        description: 'Number of slides to scroll at once',
        defaultValueHint: 1,
      },
      slidesToShow: {
        advanced: true,
        displayName: 'Slides To Show',
        type: 'number',
        description: 'Number of slides to show in one frame',
        defaultValueHint: 1,
      },
      autoplay: {
        displayName: 'Auto Play',
        type: 'boolean',
        description:
          'Automatically start scrolling; does not take effect while in the editor, but you can see it in live preview.',
        defaultValueHint: false,
      },
      autoplaySpeed: {
        displayName: 'Auto Play Speed',
        type: 'number',
        description: 'Delay between each auto scroll, in milliseconds',
        defaultValueHint: 3000,
        hidden: ps => !ps.autoplay,
      },
      centerMode: {
        displayName: 'Center Mode',
        type: 'boolean',
        description: 'Enables centered view with partial prev/next slides.',
        defaultValueHint: false,
      },
      height: {
        displayName: 'Height',
        type: 'number',
        description:
          'Fixed slider height in px. Slides fill vertically. Blank = content-driven auto height.',
      },
      variableWidth: {
        displayName: 'Variable Width',
        type: 'boolean',
        description: 'Variable width slides (slidesPerView: auto)',
        defaultValueHint: false,
      },
      infinite: {
        displayName: 'Infinite',
        type: 'boolean',
        description: 'Infinitely wrap around contents',
        defaultValueHint: true,
      },
      arrows: {
        displayName: 'Arrows',
        type: 'boolean',
        description: 'Show next/prev arrows',
        defaultValueHint: true,
      },
      arrowColor: {
        type: 'color',
        description: 'Color of next/prev arrow buttons',
        defaultValue: '#FFFFFF',
        hidden: ps => (ps.arrows === undefined ? false : !ps.arrows),
      },
      dots: {
        displayName: 'Dots',
        type: 'boolean',
        description: 'Show dots for each slide',
        defaultValueHint: false,
      },
      dotsColor: {
        displayName: 'Dots color',
        type: 'color',
        description: 'Fill color for dot indicators.',
        hidden: ps => !ps.dots,
        defaultValue: '#888888',
      },
      dotsOffset: {
        displayName: 'Dots offset',
        type: 'number',
        description: 'Distance below slider bottom edge.',
        hidden: ps => !ps.dots,
      },
      scrollbar: {
        displayName: 'Show scrollbar',
        type: 'boolean',
        description: 'Renders a draggable scrollbar below the slider.',
        defaultValueHint: false,
      },
      scrollbarColor: {
        displayName: 'Scrollbar color',
        type: 'color',
        description: 'Fill color of scrollbar thumb.',
        hidden: ps => !ps.scrollbar,
        defaultValue: '#888888',
      },
      scrollbarOffset: {
        displayName: 'Scrollbar offset',
        type: 'number',
        description: 'Distance below slider bottom edge.',
        hidden: ps => !ps.scrollbar,
      },
      speed: {
        advanced: true,
        displayName: 'Speed',
        type: 'number',
        description: 'Transition speed in milliseconds',
        defaultValueHint: 500,
      },
      swipe: {
        advanced: true,
        displayName: 'Swipe',
        type: 'boolean',
        description: 'Enable swiping to change slides',
        defaultValueHint: true,
      },
      fade: {
        advanced: true,
        displayName: 'Fade',
        type: 'boolean',
        description: 'Cross-fade between slides',
        defaultValueHint: false,
      },
      pauseOnHover: {
        displayName: 'Pause On Hover',
        type: 'boolean',
        advanced: true,
        description: 'Prevents autoplay while hovering on track',
        defaultValueHint: true,
        hidden: ps => !ps.autoplay,
      },
      beforeChange: {
        type: 'eventHandler',
        advanced: true,
        argTypes: [{ name: 'currentSlide', type: 'number' }],
      },
    },
    states: {
      currentSlide: {
        type: 'writable',
        valueProp: 'initialSlide',
        onChangeProp: 'beforeChange',
        variableType: 'number',
        ...sliderCarouselHelpers.states.currentSlide,
      },
    },
    defaultStyles: {
      width: 'stretch',
      maxWidth: '100%',
      flexDirection: 'column',
    },
  });

  // Design tokens used by the Tabs templates (MOC Design Tokens package).
  const TOKEN = {
    sbBlue: 'var(--token-fc3Q2Q8KyemN)', // Primary/SB-Blue #0057FF
    coolGray: 'var(--token-Hp64kRgAVXZr)', // Primary/Cool Gray #CDCDD0
    midnight: 'var(--token-VNtrpZ_wohdt)', // Primary/Midnight #171725
    sky: 'var(--token-ofG74SSyfuzy)', // Primary/Sky #99CEFA
    fontSize14: 'var(--token-pmOHUOYr-Cmq)', // 14px
    lineHeight140: 'var(--token-aXkjrjrUjEcP)', // 140%
  };
  // Studio stores a solid colour background as a one-stop gradient layer.
  const solid = (color: string) => `linear-gradient(${color}, ${color})`;

  // Default slot tree for a Tabs template: row (role=tablist) with two Tab
  // Buttons + Tab Underline (+ optional track box), then two Tab Contents.
  const tabsTemplateTree = (t: {
    row: Record<string, string | number>;
    button: Record<string, string | number>;
    buttonProps?: Record<string, string>;
    underline: Record<string, string | number>;
    track?: Record<string, string | number>;
  }) => ({
    type: 'vbox' as const,
    styles: {
      width: 'stretch',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
    },
    children: [
      {
        type: 'hbox' as const,
        // role=tablist is what makes the child role=tab elements valid ARIA.
        // position:relative makes it the offsetParent TabUnderline measures
        // against.
        attrs: { role: 'tablist' },
        styles: t.row,
        children: [
          ...['tab1', 'tab2'].map((tabKey, i) => ({
            type: 'component' as const,
            name: 'TabButton',
            styles: t.button,
            props: {
              tabKey,
              ...t.buttonProps,
              children: { type: 'text' as const, value: `Tab ${i + 1}` },
            },
          })),
          {
            type: 'component' as const,
            name: 'TabUnderline',
            styles: t.underline,
          },
          ...(t.track
            ? [
                {
                  type: 'box' as const,
                  elementName: 'Tab Underline Track',
                  styles: t.track,
                },
              ]
            : []),
        ],
      },
      {
        type: 'vbox' as const,
        styles: {
          width: 'stretch',
          padding: '8px',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
        },
        children: ['tab1', 'tab2'].map((tabKey, i) => ({
          type: 'component' as const,
          name: 'TabContent',
          props: {
            tabKey,
            children: [
              {
                type: 'vbox' as const,
                children: [`Some content for tab ${i + 1}`],
              },
            ],
          },
        })),
      },
    ],
  });

  // TabsContainer — vendored fork of @plasmicpkgs/plasmic-tabs. Props, slot
  // shape and `$ctx.currentTabKey` match upstream 1:1, so Studio authoring is
  // the same; the registry names stay ours (the `hostless-` prefix belongs to
  // Plasmic's hostless store packages, and we register from our own host).
  // The fork exists for accessibility: upstream renders bare divs with no
  // roles and no keyboard support.
  //
  // Authoring: insert from one of the two templates ("Underline" — Resort
  // Slide look; "Pill" — POI Map look). Each template carries the look as
  // explicit element styles, so every value shows in the style panel and can
  // be overridden or cleared like any hand-set style. Duplicate a Tab Button
  // and a Tab Content to add a tab; give both the same `tabKey`. Active text
  // colour is the container's `activeColor` (per-button `activeColor` still
  // overrides it); slot content can also bind to `$ctx.tabButton.isActive`.
  loader.registerComponent(TabsContainer, {
    name: 'TabsContainer',
    displayName: 'Tabs Container',
    importName: 'TabsContainer',
    importPath: '@/components/plasmic/tabs',
    // Upstream sets `styleSections: false` because its container renders no
    // DOM. Ours renders a wrapper div and applies `className`: without it the
    // token-scope classes never land on an ancestor and every `var(--token-*)`
    // inside the tabs resolves to nothing.
    providesData: true,
    description:
      'Create bespoke/advanced tab-like UIs. Buttons, panels and shared content live in one slot, laid out freely.',
    defaultStyles: {
      width: 'stretch',
      flexDirection: 'column',
    },
    props: {
      initialKey: {
        type: 'string',
        description: 'Key of the initially selected tab',
        defaultValue: 'tab1',
      },
      // Controlled pair backing the `currentTab` state below. Advanced: most
      // authors bind the state instead of setting these directly.
      activeKey: {
        advanced: true,
        type: 'string',
        description:
          'Controlled active key. Leave blank to let the component manage its own state.',
      },
      onActiveKeyChange: {
        advanced: true,
        type: 'eventHandler',
        argTypes: [{ name: 'key', type: 'string' }],
      },
      previewKey: {
        type: 'string',
        description: 'Show this key while editing in Plasmic Studio',
      },
      previewAll: {
        type: 'boolean',
        description: 'Reveal all tab contents while editing in Plasmic Studio',
      },
      mountMode: {
        advanced: true,
        type: 'choice',
        description: 'How to render/mount tab content.',
        options: [
          {
            label: 'Mount one at a time, unmount on hide',
            value: 'mountOneAtATime',
          },
          {
            label: 'Mount all up-front, do not unmount',
            value: 'mountAllEagerly',
          },
          {
            label: 'Mount on-demand/lazily, do not unmount',
            value: 'mountLazily',
          },
        ],
        defaultValueHint: 'mountOneAtATime',
      },
      exitDuration: {
        advanced: true,
        type: 'number',
        displayName: 'Exit duration (ms)',
        description:
          'Keeps the outgoing panel mounted this long so it can animate out. Match your transition duration. 0 unmounts at once. Panels publish $ctx.tabContent.phase (enter | open | exit).',
        defaultValueHint: 0,
      },
      activeColor: {
        type: 'color',
        displayName: 'Active color',
        description:
          'Text colour of the active tab button, for every button in this set. A button can override it.',
      },
      children: {
        type: 'slot',
        defaultValue: {
          type: 'vbox',
          styles: {
            width: 'stretch',
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
          },
          children: [
            {
              type: 'hbox',
              // role=tablist is what makes the child role=tab elements valid
              // ARIA. Keep it on whichever box wraps the buttons.
              attrs: { role: 'tablist' },
              styles: {
                width: 'hug',
                justifyContent: 'flex-start',
                alignItems: 'center',
                // position:relative makes this the offsetParent TabUnderline
                // measures against.
                position: 'relative',
              },
              children: [
                {
                  type: 'component',
                  name: 'TabButton',
                  props: {
                    tabKey: 'tab1',
                    children: { type: 'text', value: 'Tab 1' },
                  },
                },
                {
                  type: 'component',
                  name: 'TabButton',
                  props: {
                    tabKey: 'tab2',
                    children: { type: 'text', value: 'Tab 2' },
                  },
                },
                { type: 'component', name: 'TabUnderline' },
              ],
            },
            {
              type: 'vbox',
              styles: {
                width: 'stretch',
                padding: '8px',
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
              },
              children: [
                {
                  type: 'component',
                  name: 'TabContent',
                  props: {
                    tabKey: 'tab1',
                    children: [
                      {
                        type: 'vbox',
                        children: ['Some content for tab 1'],
                      },
                    ],
                  },
                },
                {
                  type: 'component',
                  name: 'TabContent',
                  props: {
                    tabKey: 'tab2',
                    children: [
                      {
                        type: 'vbox',
                        children: ['Some content for tab 2'],
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      },
    },
    // Insert templates — the two looks authored in Studio, measured 1:1 from
    // Sliders/Resort/Slide (underline) and Maps/POI Map/Map 2 (pill). Every
    // value is an explicit element style, so it is visible and overridable in
    // the style panel; nothing about the look lives in CSS. Colours reference
    // the shared design-token package (stable UUIDs across brand projects).
    templates: {
      Underline: {
        props: {
          initialKey: 'tab1',
          children: tabsTemplateTree({
            row: {
              width: 'hug',
              justifyContent: 'flex-start',
              alignItems: 'center',
              position: 'relative',
            },
            button: {
              width: 'hug',
              padding: '0 12px 6px 5px',
              fontWeight: 700,
              fontSize: TOKEN.fontSize14,
              lineHeight: TOKEN.lineHeight140,
            },
            underline: {
              height: '2px',
              background: solid(TOKEN.sbBlue),
              borderRadius: '100px',
              zIndex: 10,
            },
            // Faint track under the whole row, behind the underline.
            track: {
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: '2px',
              background: solid(TOKEN.coolGray),
              borderRadius: '100px',
            },
          }),
        },
      },
      Pill: {
        props: {
          initialKey: 'tab1',
          // One setting for the whole set; the buttons inherit it.
          activeColor: TOKEN.midnight,
          children: tabsTemplateTree({
            row: {
              width: 'hug',
              justifyContent: 'flex-start',
              alignItems: 'center',
              position: 'relative',
              padding: '5px',
              borderRadius: '50px',
              background: solid(TOKEN.midnight),
            },
            button: {
              width: 'hug',
              padding: '5px 15px',
              color: TOKEN.sky,
              fontSize: TOKEN.fontSize14,
              lineHeight: TOKEN.lineHeight140,
              // Label above the pill (the underline is a later sibling).
              position: 'relative',
              zIndex: 10,
            },
            underline: {
              top: '5px',
              height: 'calc(100% - 10px)',
              background: solid(TOKEN.sky),
              borderRadius: '50px',
            },
          }),
        },
      },
    },
    // Not upstream: makes the active tab a Studio variable other elements can
    // read *and* write ($ctx.currentTabKey is broadcast-only).
    states: {
      currentTab: {
        type: 'writable',
        valueProp: 'activeKey',
        onChangeProp: 'onActiveKeyChange',
        variableType: 'text',
      },
    },
  });

  // Active text colour is a prop because Studio cannot style slot text
  // conditionally on the active state. Slot content can also react through
  // `$ctx.tabButton.isActive` / `$ctx.tabButton.tabKey` — no key hardcoding.
  loader.registerComponent(TabButton, {
    name: 'TabButton',
    displayName: 'Tab Button',
    importName: 'TabButton',
    importPath: '@/components/plasmic/tabs',
    isAttachment: true,
    providesData: true,
    props: {
      tabKey: {
        type: 'string',
        displayName: 'Tab key',
        description: 'Key this button selects. Must match a Tab Content.',
      },
      activeColor: {
        advanced: true,
        type: 'color',
        displayName: 'Active color',
        description:
          "This button only. Empty inherits the container's Active color.",
      },
      children: {
        type: 'slot',
        defaultValue: { type: 'text', value: 'Some tab' },
      },
    },
    // No insert-time padding: an instance style would out-specify the
    // variant defaults, which carry the padding.
    defaultStyles: {
      width: 'hug',
    },
  });

  loader.registerComponent(TabContent, {
    name: 'TabContent',
    displayName: 'Tab Content',
    importName: 'TabContent',
    importPath: '@/components/plasmic/tabs',
    isAttachment: true,
    // Publishes $ctx.tabContent = { tabKey, isActive, phase }. `phase` is
    // 'open' while the tab is active and 'exit' while it animates out, so
    // content inside can bind a variant to it.
    providesData: true,
    props: {
      tabKey: {
        type: 'string',
        displayName: 'Tab key',
        description: 'Key of the Tab Button that reveals this panel.',
      },
      children: {
        type: 'slot',
        defaultValue: {
          type: 'vbox',
          children: { type: 'text', value: 'This is some tab content' },
        },
      },
    },
  });

  // TabUnderline — sliding indicator that positions itself under the active
  // TabButton. Self-measuring: it reads the active button's node from the
  // container registry. Place it next to the TabButtons, inside their
  // position:relative wrapper.
  loader.registerComponent(TabUnderline, {
    name: 'TabUnderline',
    displayName: 'Tab Underline',
    importName: 'TabUnderline',
    importPath: '@/components/plasmic/tabs',
    props: {},
    // No insert-time background: an instance style would out-specify the
    // variant default (SB-Blue for underline, Sky for pill).
  });

  // SelectionProvider + SelectionItem — generic "one active item among many".
  // The provider owns the selection, publishes it as `$ctx.selection.item`
  // and as a writable `selectedItem` state; each item registers in document
  // order and selects itself on press/hover, publishing
  // `$ctx.selectionItem.isSelected` to its slot. Auto-select-first keeps
  // something selected when items mount/unmount (e.g. a tab switch), so a
  // POI map's card follows the markers with zero per-instance wiring.
  // Items are plain Studio content: position them absolutely inside a fixed
  // box and drag them on the canvas.
  loader.registerComponent(SelectionProvider, {
    name: 'SelectionProvider',
    displayName: 'Selection Provider',
    importName: 'SelectionProvider',
    importPath: '@/components/plasmic/selection',
    providesData: true,
    description:
      'Tracks which Selection Item is active. Read it anywhere inside as $ctx.selection.item.',
    defaultStyles: {
      width: 'stretch',
    },
    props: {
      children: {
        type: 'slot',
        defaultValue: {
          type: 'hbox',
          styles: { width: 'stretch', columnGap: '16px' },
          // A bare object under `props` would be read as slot content, so
          // the JSON payload goes through the `json` element form.
          children: [1, 2].map(i => ({
            type: 'component' as const,
            name: 'SelectionItem',
            props: {
              item: { type: 'json' as const, value: { title: `Item ${i}` } },
              children: { type: 'text' as const, value: `Item ${i}` },
            },
          })),
        },
      },
      autoSelectFirst: {
        type: 'boolean',
        displayName: 'Auto-select first',
        description:
          'When nothing valid is selected (initially, or after the selected item disappears), select the first item.',
        defaultValueHint: true,
      },
      selectedItem: {
        advanced: true,
        type: 'object',
        description:
          'Controlled selected item (matched by value). Leave blank to let the component manage its own state.',
      },
      onSelectedItemChange: {
        advanced: true,
        type: 'eventHandler',
        argTypes: [{ name: 'item', type: 'object' }],
      },
      exitDuration: {
        advanced: true,
        type: 'number',
        displayName: 'Exit duration (ms)',
        description:
          'Keeps publishing the last item this long after the items disappear, with $ctx.selection.phase = "exit", so a card can fade out instead of blanking. 0 clears at once.',
        defaultValueHint: 0,
      },
      stagger: {
        advanced: true,
        type: 'number',
        displayName: 'Stagger (ms)',
        description:
          'Stagger unit between items. Each item exposes --selection-delay (index x this value) for the delay field.',
        defaultValueHint: 0,
      },
      swapDuration: {
        advanced: true,
        type: 'number',
        displayName: 'Swap duration (ms)',
        description:
          'How long $ctx.selection.phase stays on "enter" after the selection moves. Match the animation on your card\'s enter variant. 0 flips next frame, which only suits a transition.',
        defaultValueHint: 0,
      },
    },
    states: {
      selectedItem: {
        type: 'writable',
        valueProp: 'selectedItem',
        onChangeProp: 'onSelectedItemChange',
        variableType: 'object',
      },
    },
  });

  loader.registerComponent(SelectionItem, {
    name: 'SelectionItem',
    displayName: 'Selection Item',
    importName: 'SelectionItem',
    importPath: '@/components/plasmic/selection',
    isAttachment: true,
    providesData: true,
    description:
      'Selectable wrapper. Its slot reads $ctx.selectionItem.isSelected; when selected, `item` becomes $ctx.selection.item.',
    // Style variants, available when this component is the root of a Studio
    // component: style the item (and anything inside it) for the selected
    // state and for the enter/exit phases of a tab switch, with no binding.
    // `entering` is the "from" frame — it lasts one frame on mount, then the
    // component flips to its base styles, which is what runs the transition.
    variants: {
      selected: {
        cssSelector: '[data-selected="true"]',
        displayName: 'Selected',
      },
      entering: {
        cssSelector: '[data-phase="enter"]',
        displayName: 'Entering',
      },
      exiting: { cssSelector: '[data-phase="exit"]', displayName: 'Exiting' },
    },
    props: {
      item: {
        type: 'object',
        displayName: 'Item',
        description:
          'Payload published as $ctx.selection.item while this item is selected.',
      },
      selectOn: {
        type: 'choice',
        displayName: 'Select on',
        options: [
          { label: 'Press or hover', value: 'both' },
          { label: 'Press', value: 'press' },
          { label: 'Hover', value: 'hover' },
        ],
        defaultValueHint: 'both',
      },
      children: {
        type: 'slot',
        defaultValue: { type: 'text', value: 'Selectable' },
      },
    },
    defaultStyles: {
      width: 'hug',
    },
  });

  // TooltipWrapper — Wrap trigger + popup with a code component that manages
  // open state, hover/press interaction, outside-click + Escape dismiss, and
  // collision-aware auto-flip positioning (react-aria useOverlayPosition).
  // Structure and styling stay Plasmic-authored inside the two slots.
  //
  // Author DX:
  //   1. Fill `trigger` slot (any Plasmic tree).
  //   2. Fill `popup` slot (any Plasmic tree, including a close X).
  //   3. On the close X, set HTML attr `data-tooltip-close`.
  //   4. Optional: read `[data-open-via="press"]` / `[data-placement="top|
  //      bottom|left|right"]` on popup root via Plasmic variants for arrow
  //      direction and press-only close-X visibility.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loader.registerComponent(TooltipWrapper as any, {
    name: 'TooltipWrapper',
    displayName: 'Tooltip Wrapper',
    importPath: '@/components/plasmic/tooltip-wrapper',
    // Publishes $ctx.tooltip = { isOpen, phase, placement, openVia } to both
    // slots. `phase` is 'enter' | 'open' | 'exit' — bind a variant to it to
    // animate the popup in and out.
    providesData: true,
    refActions: {
      open: { displayName: 'Open tooltip', argTypes: [] },
      close: { displayName: 'Close tooltip', argTypes: [] },
      toggle: { displayName: 'Toggle tooltip', argTypes: [] },
    },
    props: {
      trigger: {
        type: 'slot',
        displayName: 'trigger',
        defaultValue: {
          type: 'text',
          value: 'Trigger',
        },
      },
      popup: {
        type: 'slot',
        displayName: 'popup',
        defaultValue: {
          type: 'vbox',
          styles: {
            // filter: drop-shadow follows painted shape of children — respects
            // inner border-radius. box-shadow would render rectangular shadow
            // around the outer wrapper.
            filter: 'drop-shadow(0px 8px 24px #0000001A)',
            position: 'relative',
          },
          children: [
            {
              type: 'vbox',
              children: [
                {
                  type: 'vbox',
                  styles: {
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                  },
                  children: {
                    attrs: {
                      'data-tooltip-close': 'true',
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } as any,
                    type: 'text',
                    value: 'x',
                    styles: {
                      width: 'auto',
                      textAlign: 'right',
                      fontSize: '20px',
                      lineHeight: '1',
                      cursor: 'pointer',
                      color: '#000000',
                    },
                  },
                },
                {
                  type: 'text',
                  value:
                    'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.',
                },
              ],
              styles: {
                zIndex: '10',
                padding: '20px',
                background: '#ffffff',
                borderRadius: '5px',
                width: '256px',
                position: 'relative',
              },
            },
            {
              type: 'vbox',
              attrs: {
                'data-tooltip-chevron': 'true',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } as any,
              styles: {
                position: 'absolute',
                width: '30px',
                height: '30px',
                background: '#ffffff',
                borderRadius: '0px 0px 5px',
                transform: 'rotate(45deg)',
                bottom: '0',
                left: 'var(--tooltip-arrow-x, 50%)',
                top: 'auto',
                right: 'auto',
              },
            },
          ],
        },
      },
      mode: {
        type: 'choice',
        displayName: 'Mode',
        description:
          'hover: opens on hover (hover-capable devices) with press as touch/keyboard fallback. press: click/tap only, hover disabled.',
        options: ['hover', 'press'],
        defaultValueHint: 'hover',
      },
      placement: {
        type: 'choice',
        displayName: 'Placement',
        description:
          'Preferred placement. Wrapper auto-flips to the opposite side when not enough space.',
        options: [
          'top',
          'bottom',
          'left',
          'right',
          'top start',
          'top end',
          'bottom start',
          'bottom end',
          'left top',
          'left bottom',
          'right top',
          'right bottom',
        ],
        defaultValueHint: 'top',
      },
      offset: {
        type: 'number',
        displayName: 'Offset (px)',
        description: 'Gap between trigger and popup.',
        defaultValueHint: 8,
      },
      hoverOpenDelay: {
        advanced: true,
        type: 'number',
        displayName: 'Hover open delay (ms)',
        defaultValueHint: 0,
      },
      hoverCloseDelay: {
        advanced: true,
        type: 'number',
        displayName: 'Hover close delay (ms)',
        description:
          'Grace period after pointer leaves — lets the user move onto the popup.',
        defaultValueHint: 150,
      },
      exitDuration: {
        advanced: true,
        type: 'number',
        displayName: 'Exit duration (ms)',
        description:
          'Keeps the popup mounted this long after closing so it can animate out. Match your transition duration. 0 unmounts at once. Popup reads $ctx.tooltip.phase (enter | open | exit).',
        defaultValueHint: 0,
      },
      open: {
        type: 'boolean',
        description:
          'Controlled open state. Leave blank to let the component manage its own state.',
      },
      onOpenChange: {
        advanced: true,
        type: 'eventHandler',
        description: 'Fires only while "Open" is unbound.',
        argTypes: [{ name: 'open', type: 'boolean' }],
      },
      onPress: {
        type: 'eventHandler',
        argTypes: [],
      },
      // Two handlers rather than one `onHoverChange(isHovered)`: Studio
      // gets two interaction lists instead of one that has to branch on a
      // boolean. `on*Change` is reserved here for writable-state pairs, and
      // hover has no controllable input prop to pair with.
      onHoverStart: {
        type: 'eventHandler',
        argTypes: [],
      },
      onHoverEnd: {
        type: 'eventHandler',
        argTypes: [],
      },
    },
    states: {
      isOpen: {
        type: 'writable',
        valueProp: 'open',
        onChangeProp: 'onOpenChange',
        variableType: 'boolean',
      },
    },
    defaultStyles: {
      width: 'hug',
      display: 'inline-flex',
      flexDirection: 'column',
    },
  });

  // CustomScrollbar — Replaces native scrollbars on its viewport with an
  // overlay track + draggable thumb. Native scrolling (wheel, keyboard,
  // touch) is preserved; the overlay just visualizes state.
  // Author DX: drop around any element that scrolls. Parent must constrain
  // height/width so native `overflow: auto` inside the viewport activates.
  loader.registerComponent(CustomScrollbar, {
    name: 'CustomScrollbar',
    displayName: 'Custom Scrollbar',
    importPath: '@/components/plasmic/custom-scrollbar',
    defaultStyles: {
      width: '100%',
      height: '100%',
    },
    props: {
      children: {
        type: 'slot',
        defaultValue: [],
      },
      orientation: {
        type: 'choice',
        options: ['vertical', 'horizontal', 'both'],
        defaultValue: 'vertical',
      },
      dragToScroll: {
        type: 'boolean',
        displayName: 'Drag to scroll',
        defaultValueHint: false,
        description:
          'Mouse click-and-drag on the content pans it (touch already does). A drag does not trigger clicks on what it ends over.',
      },
      thumbColor: {
        type: 'color',
        defaultValue: '#CDCDD0',
        description: 'Scrollbar thumb color.',
      },
      thumbHoverColor: {
        type: 'color',
        defaultValue: '#929295',
        description: 'Scrollbar thumb color while hovered or dragging.',
      },
      trackColor: {
        advanced: true,
        type: 'color',
        defaultValue: 'transparent',
        description: 'Scrollbar track color.',
      },
      thumbWidth: {
        advanced: true,
        type: 'number',
        defaultValueHint: 6,
        description: 'Thumb thickness in px.',
      },
      thumbRadius: {
        advanced: true,
        type: 'number',
        defaultValueHint: 3,
        description: 'Thumb corner radius in px.',
      },
      autoHide: {
        advanced: true,
        type: 'boolean',
        defaultValueHint: false,
        description: 'Fade scrollbar out after idle. Turn off to always show.',
      },
      autoHideDelay: {
        advanced: true,
        type: 'number',
        defaultValueHint: 800,
        description: 'Idle time (ms) before fading out.',
        hidden: ps => ps.autoHide === false,
      },
    },
  });

  // ModalWrapper — WCAG 2.1 AA modal dialog. Wraps trigger + content slots
  // with focus trap, restore, Escape/backdrop dismiss, body scroll lock,
  // and portal to <body>. Author sets `data-modal-close` HTML attribute on
  // any close button inside the content slot — component wires click→close.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loader.registerComponent(ModalWrapper as any, {
    name: 'ModalWrapper',
    displayName: 'Modal',
    importPath: '@/components/plasmic/modal',
    refActions: {
      open: { displayName: 'Open modal', argTypes: [] },
      close: { displayName: 'Close modal', argTypes: [] },
      toggle: { displayName: 'Toggle modal', argTypes: [] },
    },
    props: {
      trigger: {
        type: 'slot',
        displayName: 'trigger',
        defaultValue: {
          type: 'text',
          value: 'Open modal',
        },
      },
      content: {
        type: 'slot',
        displayName: 'content',
        defaultValue: [
          {
            type: 'vbox',
            styles: {
              background: '#ffffff',
              borderRadius: '8px',
              padding: '24px',
              width: '480px',
              maxWidth: '90vw',
              gap: '16px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              alignItems: 'center',
              justifyContent: 'flex-start',
            },
            children: [
              {
                type: 'hbox',
                styles: {
                  justifyContent: 'flex-end',
                  alignItems: 'stretch',
                  width: '100%',
                },
                children: [
                  {
                    attrs: {
                      'data-modal-close': 'true',
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } as any,
                    type: 'text',
                    value: '×',
                    styles: {
                      fontSize: '24px',
                      lineHeight: '1',
                      cursor: 'pointer',
                      textAlign: 'right',
                      width: 'wrap',
                      height: 'wrap',
                    },
                  },
                ],
              },
              {
                type: 'hbox',
                styles: {
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                },
                children: [
                  {
                    type: 'text',
                    tag: 'h2',
                    value: 'Modal title',
                    styles: { width: 'stretch' },
                  },
                ],
              },
              {
                type: 'text',
                value:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
              },
            ],
          },
          {
            type: 'box',
            styles: {
              position: 'absolute',
              top: '0',
              left: '0',
              right: '0',
              bottom: '0',
              background: 'rgba(0,0,0,0.5)',
              zIndex: '-1',
              pointerEvents: 'none',
              transitionProperty: 'all',
              transitionDuration: '1s',
            },
          },
        ],
      },
      dismissOnBackdrop: {
        type: 'boolean',
        displayName: 'Dismiss on backdrop click',
        defaultValueHint: true,
      },
      dismissOnEscape: {
        type: 'boolean',
        displayName: 'Dismiss on Escape',
        defaultValueHint: true,
      },
      preventScroll: {
        type: 'boolean',
        displayName: 'Lock body scroll',
        defaultValueHint: true,
        advanced: true,
      },
      open: {
        type: 'boolean',
        description: 'Controlled open state. Leave blank for uncontrolled.',
      },
      onOpenChange: {
        type: 'eventHandler',
        advanced: true,
        argTypes: [{ name: 'open', type: 'boolean' }],
      },
    },
    states: {
      isOpen: {
        type: 'writable',
        valueProp: 'open',
        onChangeProp: 'onOpenChange',
        variableType: 'boolean',
      },
    },
    defaultStyles: {
      width: 'hug',
      display: 'inline-flex',
    },
  });

  // AccordionContainer — WCAG 2.1 AA accordion. Three-component surface
  // (AccordionContainer + AccordionButton + AccordionContent) mirrors the
  // TabsContainer pattern. Buttons are tab-stops; ArrowDown/Up + Home/End
  // move focus. Content emits role=region + aria-labelledby.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loader.registerComponent(AccordionContainer as any, {
    name: 'AccordionContainer',
    displayName: 'Accordion Container',
    importPath: '@/components/plasmic/accordion',
    providesData: true,
    refActions: {
      setOpenKeys: {
        displayName: 'Set open keys',
        argTypes: [
          {
            name: 'keys',
            displayName: 'Keys (JSON array)',
            type: 'string',
          },
        ],
      },
      getOpenKeys: {
        displayName: 'Get open keys',
        argTypes: [],
      },
      openItem: {
        displayName: 'Open item',
        argTypes: [{ name: 'key', displayName: 'Item key', type: 'string' }],
      },
      closeItem: {
        displayName: 'Close item',
        argTypes: [{ name: 'key', displayName: 'Item key', type: 'string' }],
      },
      toggleItem: {
        displayName: 'Toggle item',
        argTypes: [{ name: 'key', displayName: 'Item key', type: 'string' }],
      },
    },
    props: {
      children: {
        type: 'slot',
        defaultValue: {
          type: 'vbox',
          styles: {
            gap: '8px',
            width: 'stretch',
          },
          children: [
            {
              type: 'vbox',
              styles: {
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: '#e5e5e5',
                borderRadius: '4px',
              },
              children: [
                {
                  type: 'component',
                  name: 'AccordionButton',
                  props: {
                    itemKey: 'item-1',
                    children: { type: 'text', value: 'Item 1' },
                  },
                },
                {
                  type: 'component',
                  name: 'AccordionContent',
                  props: {
                    itemKey: 'item-1',
                    children: {
                      type: 'vbox',
                      styles: { padding: '12px' },
                      children: {
                        type: 'text',
                        value:
                          'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
                      },
                    },
                  },
                },
              ],
            },
            {
              type: 'vbox',
              styles: {
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: '#e5e5e5',
                borderRadius: '4px',
              },
              children: [
                {
                  type: 'component',
                  name: 'AccordionButton',
                  props: {
                    itemKey: 'item-2',
                    children: { type: 'text', value: 'Item 2' },
                  },
                },
                {
                  type: 'component',
                  name: 'AccordionContent',
                  props: {
                    itemKey: 'item-2',
                    children: {
                      type: 'vbox',
                      styles: { padding: '12px' },
                      children: {
                        type: 'text',
                        value:
                          'Ut enim ad minim veniam, quis nostrud exercitation.',
                      },
                    },
                  },
                },
              ],
            },
          ],
        },
      },
      mode: {
        type: 'choice',
        options: ['single', 'multiple'],
        defaultValueHint: 'single',
        description:
          '`single` closes any previously open item when a new one opens; `multiple` allows any combination.',
      },
      defaultOpenKeys: {
        type: 'string',
        description:
          'Initially open item keys as a JSON array (e.g. `["item-1"]`).',
      },
      openKeys: {
        advanced: true,
        type: 'string',
        description:
          'Controlled JSON array of open keys. Leave blank for uncontrolled.',
      },
      onOpenKeysChange: {
        type: 'eventHandler',
        advanced: true,
        argTypes: [{ name: 'keys', type: 'string' }],
      },
      mountMode: {
        advanced: true,
        type: 'choice',
        options: [
          {
            label: 'Mount one at a time, unmount on close',
            value: 'mountOneAtATime',
          },
          {
            label: 'Mount all up-front, do not unmount',
            value: 'mountAllEagerly',
          },
          {
            label: 'Mount on first open, do not unmount',
            value: 'mountLazily',
          },
        ],
        defaultValueHint: 'mountOneAtATime',
      },
      enableKeyboardNav: {
        advanced: true,
        type: 'boolean',
        description:
          'When on, ArrowDown/Up + Home/End move focus between headers.',
        defaultValueHint: true,
      },
      previewAll: {
        advanced: true,
        type: 'boolean',
        description: 'Reveal all panels while editing in Studio.',
      },
    },
    states: {
      openKeys: {
        type: 'writable',
        valueProp: 'openKeys',
        onChangeProp: 'onOpenKeysChange',
        variableType: 'text',
      },
    },
    defaultStyles: {
      width: 'stretch',
      flexDirection: 'column',
    },
  });

  loader.registerComponent(AccordionButton, {
    name: 'AccordionButton',
    displayName: 'Accordion Button',
    importPath: '@/components/plasmic/accordion',
    isAttachment: true,
    props: {
      itemKey: {
        type: 'choice',
        displayName: 'Item key',
        description:
          'Identifier this button toggles. Pick a key declared by a sibling AccordionButton or AccordionContent, or type a new one to establish a pair. See plasmic-docs/props-and-data.md.',
        allowSearch: true,
        required: true,
        defaultValue: 'item-1',
        options: (
          _props: unknown,
          ctx: { knownItemKeys?: { label: string; value: string }[] } | null
        ) => ctx?.knownItemKeys ?? [],
      },
      children: {
        type: 'slot',
        defaultValue: { type: 'text', value: 'Accordion item' },
      },
    },
    defaultStyles: {
      width: 'stretch',
      padding: '12px',
      background: 'transparent',
      borderWidth: '0',
      borderStyle: 'none',
      cursor: 'pointer',
      textAlign: 'left',
    },
  });

  loader.registerComponent(AccordionContent, {
    name: 'AccordionContent',
    displayName: 'Accordion Content',
    importPath: '@/components/plasmic/accordion',
    isAttachment: true,
    props: {
      itemKey: {
        type: 'choice',
        displayName: 'Item key',
        description:
          'Identifier this content shows for. Pick the matching AccordionButton itemKey (or a new key to establish a pair). See plasmic-docs/props-and-data.md.',
        allowSearch: true,
        required: true,
        defaultValue: 'item-1',
        options: (
          _props: unknown,
          ctx: { knownItemKeys?: { label: string; value: string }[] } | null
        ) => ctx?.knownItemKeys ?? [],
      },
      children: {
        type: 'slot',
        defaultValue: {
          type: 'vbox',
          children: {
            type: 'text',
            value: 'Panel content',
          },
        },
      },
    },
  });

  // FormContainer — react-hook-form root. Establishes FormProvider so
  // nested FormField / *Input components share validation state. Exposes
  // `$ctx.form.{isSubmitting,isValid,errors}` and ref actions submit/reset.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loader.registerComponent(FormContainer as any, {
    name: 'FormContainer',
    displayName: 'Form',
    importPath: '@/components/plasmic/form/form-container',
    providesData: true,
    refActions: {
      submit: { displayName: 'Submit form', argTypes: [] },
      reset: { displayName: 'Reset form', argTypes: [] },
    },
    props: {
      children: {
        type: 'slot',
        defaultValue: {
          type: 'vbox',
          styles: { gap: '12px', width: 'stretch' },
          children: [
            {
              type: 'component',
              name: 'FormField',
              props: {
                name: 'email',
                label: { type: 'text', value: 'Email' },
                required: true,
                children: {
                  type: 'component',
                  name: 'TextInput',
                  props: { type: 'email' },
                },
              },
            },
          ],
        },
      },
      defaultValues: {
        type: 'code',
        lang: 'json',
        description:
          'Initial field values as a JSON object keyed by field name.',
      } as never,
      mode: {
        advanced: true,
        type: 'choice',
        options: ['onSubmit', 'onBlur', 'onChange', 'onTouched', 'all'],
        defaultValueHint: 'onSubmit',
      },
      onValidSubmit: {
        type: 'eventHandler',
        argTypes: [{ name: 'values', type: 'object' }],
      },
      onInvalidSubmit: {
        type: 'eventHandler',
        advanced: true,
        argTypes: [{ name: 'errors', type: 'object' }],
      },
    },
    defaultStyles: {
      width: 'stretch',
      flexDirection: 'column',
    },
  });

  // FormField — label + description + error wrapper for a single form
  // field. Establishes context so nested input primitives auto-wire
  // name/id/aria. Must live inside a FormContainer.
  loader.registerComponent(FormField, {
    name: 'FormField',
    displayName: 'Form Field',
    importPath: '@/components/plasmic/form/form-field',
    isAttachment: true,
    props: {
      name: {
        type: 'string',
        description:
          'react-hook-form field name. Nested inputs bind here automatically.',
      },
      label: {
        type: 'slot',
        defaultValue: { type: 'text', value: 'Label' },
      },
      description: {
        type: 'slot',
      },
      required: {
        type: 'boolean',
        defaultValueHint: false,
      },
      children: {
        type: 'slot',
      },
    },
    defaultStyles: {
      width: 'stretch',
      flexDirection: 'column',
    },
  });

  loader.registerComponent(TextInput, {
    name: 'TextInput',
    displayName: 'Text Input',
    importPath: '@/components/plasmic/form/text-input',
    props: {
      name: {
        type: 'string',
        advanced: true,
        description: 'Overrides enclosing FormField name. Usually leave blank.',
      },
      type: {
        type: 'choice',
        options: [
          'text',
          'email',
          'tel',
          'number',
          'password',
          'url',
          'search',
          'textarea',
        ],
        defaultValueHint: 'text',
      },
      placeholder: { type: 'string' },
      autoComplete: { type: 'string', advanced: true },
      disabled: { type: 'boolean', advanced: true },
      readOnly: { type: 'boolean', advanced: true },
      rows: {
        type: 'number',
        advanced: true,
        hidden: ps => ps.type !== 'textarea',
      },
      min: {
        type: 'number',
        advanced: true,
        hidden: ps => ps.type !== 'number',
      },
      max: {
        type: 'number',
        advanced: true,
        hidden: ps => ps.type !== 'number',
      },
      step: {
        type: 'number',
        advanced: true,
        hidden: ps => ps.type !== 'number',
      },
    },
    defaultStyles: {
      width: 'stretch',
    },
  });

  loader.registerComponent(SelectInput, {
    name: 'SelectInput',
    displayName: 'Select Input',
    importPath: '@/components/plasmic/form/select-input',
    props: {
      name: { type: 'string', advanced: true },
      options: {
        type: 'array',
        itemType: {
          type: 'object',
          nameFunc: (item: { label?: string; value?: string }) =>
            item?.label || item?.value || 'New option',
          fields: {
            label: { type: 'string', displayName: 'Label' },
            value: { type: 'string', displayName: 'Value' },
          },
        },
        defaultValue: [],
      },
      placeholder: { type: 'string' },
      disabled: { type: 'boolean', advanced: true },
    },
    defaultStyles: {
      width: 'stretch',
    },
  });

  loader.registerComponent(CheckboxInput, {
    name: 'CheckboxInput',
    displayName: 'Checkbox Input',
    importPath: '@/components/plasmic/form/checkbox-input',
    props: {
      name: { type: 'string', advanced: true },
      label: {
        type: 'slot',
        defaultValue: { type: 'text', value: 'Check me' },
      },
      disabled: { type: 'boolean', advanced: true },
    },
    defaultStyles: {
      width: 'hug',
      padding: '8px',
    },
  });

  loader.registerComponent(RadioGroupInput, {
    name: 'RadioGroupInput',
    displayName: 'Radio Group Input',
    importPath: '@/components/plasmic/form/radio-group-input',
    props: {
      name: { type: 'string', advanced: true },
      options: {
        type: 'array',
        itemType: {
          type: 'object',
          nameFunc: (item: { label?: string; value?: string }) =>
            item?.label || item?.value || 'New option',
          fields: {
            label: { type: 'string', displayName: 'Label' },
            value: { type: 'string', displayName: 'Value' },
          },
        },
        defaultValue: [],
      },
      direction: {
        type: 'choice',
        options: ['column', 'row'],
        defaultValueHint: 'column',
      },
      disabled: { type: 'boolean', advanced: true },
    },
    defaultStyles: {
      width: 'stretch',
    },
  });

  // CheckboxGroupInput — multi-select checkbox list bound to a string[]
  // form value. Author supplies an itemTemplate slot; Plasmic clones it per
  // option and exposes $ctx.checkboxOption.{label,value,checked,toggle}.
  loader.registerComponent(CheckboxGroupInput, {
    name: 'CheckboxGroupInput',
    displayName: 'Checkbox Group Input',
    importPath: '@/components/plasmic/form/checkbox-group-input',
    providesData: true,
    props: {
      name: { type: 'string', advanced: true },
      options: {
        type: 'array',
        itemType: {
          type: 'object',
          nameFunc: (item: { label?: string; value?: string }) =>
            item?.label || item?.value || 'New option',
          fields: {
            label: { type: 'string', displayName: 'Label' },
            value: { type: 'string', displayName: 'Value' },
          },
        },
        defaultValue: [],
      },
      itemTemplate: {
        type: 'slot',
        displayName: 'Item template',
        description:
          'Rendered once per option. Bind text/state via $ctx.checkboxOption.{label,value,checked}. Wire click to $ctx.checkboxOption.toggle.',
        defaultValue: {
          type: 'hbox',
          styles: {
            gap: '8px',
            alignItems: 'center',
            cursor: 'pointer',
          },
          children: [
            {
              type: 'text',
              value: '☐ (bind to $ctx.checkboxOption.checked)',
            },
            {
              type: 'text',
              value: 'Label (bind to $ctx.checkboxOption.label)',
            },
          ],
        },
      },
      direction: {
        type: 'choice',
        options: ['column', 'row'],
        defaultValueHint: 'column',
      },
      disabled: { type: 'boolean', advanced: true },
    },
    defaultStyles: {
      width: 'stretch',
    },
  });

  // ComboboxInput — searchable single-select with client-side substring
  // filter. role=combobox with arrow-key navigation, Enter to select,
  // Escape to close, outside-click dismiss. Static options only for MVP.
  loader.registerComponent(ComboboxInput, {
    name: 'ComboboxInput',
    displayName: 'Combobox Input',
    importPath: '@/components/plasmic/form/combobox-input',
    props: {
      name: { type: 'string', advanced: true },
      options: {
        type: 'array',
        itemType: {
          type: 'object',
          nameFunc: (item: { label?: string; value?: string }) =>
            item?.label || item?.value || 'New option',
          fields: {
            label: { type: 'string', displayName: 'Label' },
            value: { type: 'string', displayName: 'Value' },
          },
        },
        defaultValue: [],
      },
      placeholder: { type: 'string' },
      noResultsLabel: {
        type: 'string',
        advanced: true,
        defaultValueHint: 'No results',
      },
      disabled: { type: 'boolean', advanced: true },
    },
    defaultStyles: {
      width: 'stretch',
    },
  });

  // DatePickerInput — date or date-range picker. Popover on desktop,
  // full-screen modal below `modalBreakpoint` (default 640px). Value
  // serializes to ISO string (single) or JSON `{start,end}` (range).
  loader.registerComponent(DatePickerInput, {
    name: 'DatePickerInput',
    displayName: 'Date Picker Input',
    importPath: '@/components/plasmic/form/date-picker-input',
    props: {
      name: { type: 'string', advanced: true },
      mode: {
        type: 'choice',
        options: ['single', 'range'],
        defaultValueHint: 'single',
      },
      placeholder: { type: 'string' },
      minValue: {
        type: 'string',
        description: 'ISO date lower bound (YYYY-MM-DD).',
      },
      maxValue: {
        type: 'string',
        description: 'ISO date upper bound (YYYY-MM-DD).',
      },
      unavailableDates: {
        type: 'string',
        description:
          'Blocked dates. Either a JSON array `["2026-01-15","2026-02-01"]` or a comma-separated list. Bindable to a dynamic value.',
      },
      locale: {
        type: 'string',
        advanced: true,
        defaultValueHint: 'en-US',
      },
      modalBreakpoint: {
        type: 'number',
        advanced: true,
        description:
          'Viewport width (px) below which the calendar opens as a modal. Set to 0 to always use a popover.',
        defaultValueHint: 640,
      },
      disabled: { type: 'boolean', advanced: true },
    },
    defaultStyles: {
      width: 'stretch',
    },
  });
}

if (PLASMIC) {
  registerFunctions(PLASMIC);
  registerComponents(PLASMIC);
}
if (PREVIEW_PLASMIC) {
  registerFunctions(PREVIEW_PLASMIC);
  registerComponents(PREVIEW_PLASMIC);
}
