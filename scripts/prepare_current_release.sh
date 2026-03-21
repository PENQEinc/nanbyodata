#!/bin/sh

set -eu

BASE_DIR="/app"
ONTOLOGY_DIR="${BASE_DIR}/ontology"
CURRENT_RELEASE_DIR="${ONTOLOGY_DIR}/current_release"
REQUIRED_FILES="nando.tsv nando_ja.obo nando_en.obo"

mkdir -p "${CURRENT_RELEASE_DIR}"

missing_files=""
for file in ${REQUIRED_FILES}; do
  if [ ! -f "${CURRENT_RELEASE_DIR}/${file}" ]; then
    missing_files="${missing_files} ${file}"
  fi
done

if [ -z "${missing_files}" ]; then
  echo "current_release is already complete."
  exit 0
fi

latest_release_dir=""
for dir in "${ONTOLOGY_DIR}"/20??-??-??; do
  if [ ! -d "${dir}" ]; then
    continue
  fi

  complete_dir="yes"
  for file in ${REQUIRED_FILES}; do
    if [ ! -f "${dir}/${file}" ]; then
      complete_dir="no"
      break
    fi
  done

  if [ "${complete_dir}" = "yes" ]; then
    latest_release_dir="${dir}"
  fi
done

if [ -z "${latest_release_dir}" ]; then
  echo "No dated ontology release contains all required current_release files." >&2
  exit 1
fi

echo "Preparing current_release from ${latest_release_dir}"
for file in ${REQUIRED_FILES}; do
  if [ ! -f "${CURRENT_RELEASE_DIR}/${file}" ]; then
    cp "${latest_release_dir}/${file}" "${CURRENT_RELEASE_DIR}/${file}"
    echo "Copied ${file} into current_release"
  fi
done
