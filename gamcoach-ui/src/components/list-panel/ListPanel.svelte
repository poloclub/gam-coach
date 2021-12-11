<script>
  import d3 from '../../utils/d3-import';
  import '../../typedef';
  import { onMount, onDestroy } from 'svelte';
  import ListItem from '../list-item/ListItem.svelte';
  import { tooltipConfigStore } from '../../store';
  import { flip } from 'svelte/animate';
  import { crossfade } from 'svelte/transition';

  export let featuresStore = null;
  export let windowLoaded = false;

  // Component variables
  let component = null;
  let tooltipConfig = null;
  /** @type {Feature[]} */
  let features = [];
  const unsubscribes = [];
  let initialized = false;

  const DURATION = 800;

  // Set up tooltip
  unsubscribes.push(
    tooltipConfigStore.subscribe(value => {
      tooltipConfig = value;
    })
  );

  // Set up animations
  const [send, receive] = crossfade({
    duration: DURATION,

    // Called when there is no counter part (node creations)
    // We don't need to apply animation here
    fallback() {
      // pass
    }
  });

  /**
   * Bind the features variable when the store is passed to the child here
   */
  const initFeatures = () => {
    unsubscribes.push(
      featuresStore.subscribe(value => {
        features = value;
      })
    );
  };

  /**
   * Initialize the lists panel
   */
  const initList = () => {
    console.log('received features!');
    console.log(features);

    // Randomly assign different groups to a few features
    features[0].isChanged = 1;
    features[1].isChanged = 1;
    features[2].isChanged = 1;
    features[2].isConstrained = true;
    features[2].acceptableRange = [1, 2, 3, 4, 5, 6, 7, 8];
    features[3].isChanged = 2;
    features[4].isChanged = 2;
    features[4].isConstrained = true;
    features[4].difficulty = 6;
    features[5].isConstrained = true;
    features[5].difficulty = 2;
    features[5].acceptableRange = [1, 2];
    features[6].isConstrained = true;
    features[7].isConstrained = true;
    features[7].acceptableRange = [5.28, 10.55];
    features[8].isConstrained = true;
    features[8].acceptableRange = [1, 2, 3, 4, 5];
    features[15].isChanged = 1;

    // Tell feature panel to display features that are changed
    features.forEach(f => {
      if (f.isChanged === 1) {
        f.display = 1;
      }
    });

    featuresStore.set(features);

    initialized = true;
  };

  /**
   * Event handler for the mouse click event on the list items.
   * @param e Event
   * @param feature The feature object associated with the clicked item
   */
  const itemClickHandler = (e, feature) => {
    // Schedule to show/hide a card
    if (e.detail.selected) {
      if (feature.display === 0) {
        feature.display = 1;
        featuresStore.set(features);
      }
    } else {
      if (feature.display !== 0) {
        feature.display = 0;
        featuresStore.set(features);
      }
    }
  };

  const shuffleOrder = () => {
    console.log('shuffling!');
    features[10].isConstrained = true;
    featuresStore.set(features);
  };

  onMount(() => {
    // setTimeout(() => {
    //   shuffleOrder();
    // }, 2000);
  });

  onDestroy(() => {
    unsubscribes(unsub => unsub());
  });

  $: windowLoaded && featuresStore && initFeatures();
  $: windowLoaded && features.length !== 0 && !initialized && initList();

</script>

<style lang='scss'>
  @import './ListPanel.scss';
</style>

<div class='list-panel' bind:this={component}>

  <!-- We split the categories into four different divs in the list -->
  <div class='list list-changed'>
    <span class='list-title no-margin'>Changed Features</span>
    <!-- <span class='list-subtitle'>Features with a different value than the original</span> -->

    <div class='sub-list list-changed-coach'>
      <span class='list-title'>suggested changes</span>

      <div class='list-items'>
        {#each features.filter(f => f.isChanged === 1) as f (f.featureID)}
          <div class='list-item-wrapper'
            animate:flip='{{duration: DURATION}}'
            in:receive='{{key: f.featureID}}'
            out:send='{{key: f.featureID}}'
          >
            <ListItem
              feature={f}
              on:itemClicked={(e) => itemClickHandler(e, f)}
            />
          </div>
        {/each}
      </div>
    </div>

    <div class='sub-list list-changed-me'>
      <span class='list-title'>my changes</span>

      <div class='list-items'>
        {#each features.filter(f => f.isChanged === 2) as f (f.featureID)}
          <div class='list-item-wrapper'
            animate:flip='{{duration: DURATION}}'
            in:receive='{{key: f.featureID}}'
            out:send='{{key: f.featureID}}'
          >
            <ListItem
              feature={f}
              on:itemClicked={(e) => itemClickHandler(e, f)}
            />
          </div>
        {/each}
      </div>
    </div>

  </div>

  <div class='list list-constrained'>
    <span class='list-title'>Configured Features</span>

    <div class='list-items'>
      {#each features.filter(f => f.isChanged === 0 && f.isConstrained) as f (f.featureID)}
        <div class='list-item-wrapper'
          animate:flip='{{duration: DURATION}}'
          in:receive='{{key: f.featureID}}'
          out:send='{{key: f.featureID}}'
        >
          <ListItem
            feature={f}
            on:itemClicked={(e) => itemClickHandler(e, f)}
          />
        </div>
      {/each}
    </div>
  </div>

  <div class='list list-other'>
    <span class='list-title'>Other Features</span>

    <div class='list-items'>
      {#each features.filter(f => f.isChanged === 0 && !f.isConstrained) as f (f.featureID)}
        <div class='list-item-wrapper'
          animate:flip='{{duration: DURATION}}'
          in:receive='{{key: f.featureID}}'
          out:send='{{key: f.featureID}}'
        >
          <ListItem
            feature={f}
            on:itemClicked={(e) => itemClickHandler(e, f)}
          />
        </div>
      {/each}
    </div>
  </div>

</div>