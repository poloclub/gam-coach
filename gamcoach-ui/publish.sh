#!/bin/bash

# Not copying the whole directory because we need a different index.html in gh-page
npm run build
cp -r ./public/*png ../gh-page
cp -r ./public/*.svg ../gh-page
cp -r ./public/data ../gh-page
cp -r ./public/videos ../gh-page
cp -r ./public/build ../gh-page
cp -r ./public/favicon ../gh-page
cp -r ./public/global.css ../gh-page
cp -r ./public/imgs ../gh-page

# cp -r ./public/*png ../gh-page/user-study
# cp -r ./public/*.svg ../gh-page/user-study
# cp -r ./public/data ../gh-page/user-study
# cp -r ./public/videos ../gh-page/user-study
# cp -r ./public/build ../gh-page/user-study
# cp -r ./public/favicon ../gh-page/user-study
# cp -r ./public/global.css ../gh-page/user-study
# cp -r ./public/imgs ../gh-page/user-study

# cd ../gh-page
# git add ./*
# git commit -s -m "Deploy: $(git log '--format=format:%H' master -1)"
# git push origin gh-pages
npx gh-pages -m "Deploy $(git log '--format=format:%H' master -1)" -d ../gh-page
# cd ./gamcoach-ui