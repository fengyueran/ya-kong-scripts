#!/bin/bash
set -e
workspace=/workspace
studyinstanceuid_prefix="1.3976.2.0.10"
seriesinstanceuid_prefix="1.3976.1.13.1000"
sopinstanceuid_prefix="1.3976.1.14.1000"
studyidentifier=$(echo $RANDOM | cksum | cut -c 1-8 | xargs)
pdfidentifier=$(echo $RANDOM | cksum | cut -c 1-8 | xargs)
imgidentifier=$(echo $RANDOM | cksum | cut -c 1-8 | xargs)
processid=1
timestamp=$(date +%s)
counter=$(date +%3N)
date=$(date "+%Y%m%d")
time=$(date "+%H%M%S")

description="DEEPVESSEL FFR"
studyinstanceuid=$studyinstanceuid_prefix.$studyidentifier.$processid.$timestamp.$counter
pdfseriesinstanceuid=$seriesinstanceuid_prefix.$pdfidentifier.$processid.$timestamp.$counter
imgseriesinstanceuid=$seriesinstanceuid_prefix.$imgidentifier.$processid.$timestamp.$counter
echo StudyInstanceUID: $studyinstanceuid

generate_pdf() {
    patient_name=$1
    patient_id=$2
    accession_number=$3

    rm -rf $workspace/report
    if [ "$qcf" == "true" ]; then
        mkdir -p $workspace/report
        cp $qcf_data $workspace/report/_pdf_data.json
    else
        cp -r $report_data $workspace/report
        if [ -f "$template_file" ]; then
            cp $template_file $workspace/report/
        fi
    fi
    cmd="node /src/index.js $workspace/report $output_pdf $qcf"
    if [ "$patient_name" != "" ]; then
        cmd="$cmd patientName=\"$patient_name\""
    fi
    if [ "$patient_id" != "" ]; then
        cmd="$cmd patientId=\"$patient_id\""
    fi
    if [ "$accession_number" != "" ]; then
        cmd="$cmd ctNumber=\"$accession_number\""
    fi
    echo $cmd
    eval $cmd
}

pdf2img() {
    rm -rf temporaryfile*
    pdftocairo -jpeg $1 temporaryfile
    ls temporaryfile* >$workspace/pdfimg.txt
}

img2dicom() {
    list_file=$1
    output_dcm=$2
    tag=$3
    seriesinstanceuid=$pdfseriesinstanceuid
    sopinstanceuid=$sopinstanceuid_prefix.$pdfidentifier.$processid.$timestamp
    seriesnumber=1
    if [ "$tag" != "p" ]; then
        seriesinstanceuid=$imgseriesinstanceuid
        sopinstanceuid=$sopinstanceuid_prefix.$imgidentifier.$processid.$timestamp
        seriesnumber=2
    fi
    i=1
    for t in $(cat $list_file); do
        dcm="$output_dcm$tag$i.dcm"
        echo "$t to $dcm"
        img2dcm $t $dcm
        for key in "${!tag_ary[@]}"; do
            dcmodify -i "$key=${tag_ary[$key]}" $dcm
        done
        dcmodify -i "InstanceNumber=$i" $dcm
        dcmodify -i "StudyInstanceUID=$studyinstanceuid" $dcm
        dcmodify -i "SeriesInstanceUID=$seriesinstanceuid" $dcm
        dcmodify -i "SOPInstanceUID=$sopinstanceuid.$i" $dcm
        dcmodify -i "StudyDescription=$description" $dcm
        dcmodify -i "SeriesDescription=$description" $dcm
        dcmodify -i "StudyDate=$date" $dcm
        dcmodify -i "StudyTime=$time" $dcm
        dcmodify -i "SeriesDate=$date" $dcm
        dcmodify -i "SeriesTime=$time" $dcm
        dcmodify -i "SeriesNumber=$seriesnumber" $dcm
        dcmdjpeg $dcm $dcm
        i=$(($i + 1))
    done
}

usage() {
    echo "Usage: $0 -t <file> -g <string> -p <file> -d <directory> [-q] [-i] [-r <directory>] [-f <file>]" 1>&2
    echo "          -t 用于生成报告的模板文件" 1>&2
    echo "          -g DICOM Tags,写入到生成的DICOM里" 1>&2
    echo "          -p 输出PDF文件的路径" 1>&2
    echo "          -d 输出DICOM文件的目录" 1>&2
    echo "          -q 是不是QCF" 1>&2
    echo "          -i 是否生成结果目录下的图片序列" 1>&2
    echo "          -r 正常报告的文件目录" 1>&2
    echo "          -f QCF报告的PDF JSON文件" 1>&2
    exit 1
}
qcf="false"
gimg="false"
while getopts ":qit:r:f:g:p:d:" o; do
    case "${o}" in
    q)
        qcf="true"
        ;;
    i)
        gimg="true"
        ;;
    t)
        template_file=${OPTARG}
        ;;
    r)
        report_data=${OPTARG}
        if [[ "$report_data" != "*/" ]]; then
            report_data="$report_data/"
        fi
        ;;
    f)
        qcf_data=${OPTARG}
        ;;
    g)
        dicom_tags=${OPTARG}
        ;;
    p)
        output_pdf=${OPTARG}
        ;;
    d)
        output_dcm=${OPTARG}
        if [[ "$output_dcm" != "*/" ]]; then
            output_dcm="$output_dcm/"
        fi
        ;;
    *)
        usage
        ;;
    esac
done

if [ -z "${template_file}" ] || [ -z "${dicom_tags}" ] || [ -z "${output_pdf}" ] || [ -z "${output_dcm}" ]; then
    usage
fi
if [ "$qcf" == "true" ]; then
    if [ -z "${qcf_data}" ]; then
        usage
    fi
else
    if [ -z "${report_data}" ]; then
        usage
    fi
fi

mkdir -p $workspace
cd $workspace
mkdir -p $output_dcm
mkdir -p $workspace/jpg

eval "declare -A tag_ary=($(echo -n $dicom_tags | jq -r '. | to_entries | .[] | @sh "[\(.key)]=\(.value)"'))"
for key in "${!tag_ary[@]}"; do
    eval "$key=\"${tag_ary[$key]}\""
done

generate_pdf "$PatientName" "$PatientID" "$AccessionNumber"
if [ $? -ne 0 ]; then
    exit 1
fi

pdf2img $output_pdf
if [ $? -ne 0 ]; then
    exit 2
fi

rm -rf ${output_dcm}*
img2dicom $workspace/pdfimg.txt $output_dcm p
if [ $? -ne 0 ]; then
    exit 3
fi

if [[ "$qcf" != "true" && "$gimg" == "true" ]]; then
    rm -rf $workspace/jpg/*
    for png in $(ls -v $report_data/*.png | xargs -n 1 basename); do
        convert $report_data/$png $workspace/jpg/${png%.*}.jpg
    done
    find $workspace/jpg/* >$workspace/img.txt
    img2dicom $workspace/img.txt $output_dcm i
    if [ $? -ne 0 ]; then
        exit 4
    fi
fi
rm -rf ${output_dcm}/*.bak

echo "success"
exit 0
