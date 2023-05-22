set -e

baylRepoName=bayl-service
branch=master

uploadBundleToBayl(){
  cd $baylRepoName
  # git pull
  cp -r ../dist third_party/generate_pdf
  # status=`git status -s` 
  # if [ ! $status ]; then  
  #   echo "Nothing change"  
  # else  
  #   git add .
  #   git commit -m "update script"
  #   git push origin $branch
  # fi
  }



pushCode(){
  cd ..
  status=`git status -s` 
  if [ ! $status ]; then  
    echo "Nothing change"  
  else  
    git add .
    git commit -m "update script"
    git push
  fi
}

buildAndUpload(){
  echo start buildBundle.........................................
  # yarn buildBundle

  echo start uploadBundleToBayl.........................................
  uploadBundleToBayl

  echo start pushCode.........................................
  pushCode

  echo build and upload success!!!
}

if [ -d $baylRepoName ]; then
  buildAndUpload
else
  git clone -b $branch git@git.keyayun.com:keyayun/bayl-service.git
  buildAndUpload
fi