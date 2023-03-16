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

buildPushCode(){
  yarn buildBundle
  git status
  git add .
  git commit -m "update script"
  git push
}

buildAndUpload(){
  buildPushCode
  uploadBundleToBayl
  echo build and upload success!!!
}

if [ -d $baylRepoName ]; then
  buildAndUpload
else
  git clone -b $branch git@git.keyayun.com:keyayun/bayl-service.git
  buildAndUpload
fi