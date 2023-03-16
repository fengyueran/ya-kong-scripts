set -e

baylRepoName=bayl-service
branch=master

uploadBundleToBayl(){
  cd $baylRepoName
  git pull
  cp -r ../dist/ third_party/generate_pdf/
  git status
  git add .
  git commit -m "update script"
  git push origin $branch
}

buildAndUpdate(){
  yarn buildBundle
  git status
  git add .
  git commit -m "update script"
  git push
}

buildAndUpload(){
  buildAndUpdate
  uploadBundleToBayl
}

if [ -d $baylRepoName ]; then
  buildAndUpload
else
  git clone -b test git@git.keyayun.com:keyayun/bayl-service.git
  buildAndUpload
fi