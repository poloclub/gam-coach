<svelte:head>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bulma/0.9.1/css/bulma.min.css"
    integrity="sha512-ZRv40llEogRmoWgZwnsqke3HNzJ0kiI0+pcMgiz2bxO6Ew1DVBtWjVn0qjrXdT3+u+pSN36gLgmJiiQ3cQtyzA=="
    crossorigin="anonymous" />
</svelte:head>

<script>
  import Main from './Main.svelte';
</script>

<style lang='scss'>
  .stand-alone-page {
    color: #333;
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
    font-size: 16px;
    font-weight: 400;
    line-height: 1.5;
  }
</style>

<div class='stand-alone-page'>
	<Main />
</div>