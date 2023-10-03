<script>
  import Article from './components/article/Article.svelte';
</script>

<svelte:head>
  <script
    type="module"
    src="https://unpkg.com/recommender-overlay/dist/recommender-overlay.es.js"
  ></script>
</svelte:head>

<div class="stand-alone-page">
  <recommender-overlay
    my-brand="GAM Coach"
    position-left="20"
    display-delay="20000"
  />
  <Article />
</div>

<style lang="scss">
  .stand-alone-page {
    color: #333;
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
      Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
    font-size: 16px;
    font-weight: 400;
    line-height: 1.5;
  }
</style>
