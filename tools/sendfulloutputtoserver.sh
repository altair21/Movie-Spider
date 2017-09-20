babel-node ./tools/genoutput.js
scp ./output/full_output.json arcn03:/root/
ssh arcn03 "docker cp ./full_output.json movie-spider:/root/workspace/Movie-Spider/output/"
scp ./output/output.json arjp01:/data/wwwroot/movie.altair21.org/output.json
