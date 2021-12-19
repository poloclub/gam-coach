<script>
  //@ts-check
  import '../../typedef';
  import Coach from '../coach/Coach.svelte';
  import DiffPicker from '../DiffPicker.svelte';
  import ConfirmModal from '../confirm-modal/ConfirmModal.svelte';
  import BookmarkPanel from '../bookmark-panel/BookmarkPanel.svelte';
  import Tooltip from '../Tooltip.svelte';

  import d3 from '../../utils/d3-import';
  import { onMount, onDestroy } from 'svelte';
  import { writable } from 'svelte/store';
  import { fade, fly } from 'svelte/transition';
  import { tooltipConfigStore } from '../../store';

  const unsubscribes = [];
  let windowLoaded = false;

  // Set up tooltip
  let tooltip = null;
  let tooltipConfig = null;
  unsubscribes.push(
    tooltipConfigStore.subscribe(value => {tooltipConfig = value;})
  );

  onMount(() => {
    window.onload = () => { windowLoaded = true; };
  });

  onDestroy(() => {
    unsubscribes.forEach(unsub => unsub());
  });

</script>

<style lang='scss'>
  @import './Article.scss';
</style>

<div class='page'>

  <Tooltip bind:this={tooltip}/>

  <div class='top'>

    <div class='top-fill'></div>

    <div class='top-empty'></div>

    <div class='coach-left'>
      <div class='arrow'></div>
      <div class='title'>You are loan applicant #006</div>
    </div>

    <div class='coach-right'>
      right content
    </div>

    <div class='coach-wrapper'>
      <Coach windowLoaded={windowLoaded} />
    </div>

    <DiffPicker/>
    <ConfirmModal/>
    <BookmarkPanel windowLoaded={windowLoaded}/>
  </div>


</div>