import * as React from "react";
import { getBase64 } from "./utils";
import {
  ImageType,
  ImageListType,
  ImageUploadingPropsType,
  ErrorsType,
} from "./typings";

const { useRef, useState, useEffect } = React;

const defaultErrors: ErrorsType = {
  maxFileSize: false,
  maxNumber: false,
  acceptType: false,
};

const ImageUploading: React.FC<ImageUploadingPropsType> = ({
  multiple,
  onChange,
  maxNumber,
  children,
  defaultValue,
  acceptType,
  maxFileSize,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageList, setImageList] = useState(() => {
    let initImageList: Array<ImageType> = [];
    if (defaultValue) {
      initImageList = defaultValue.map((item: ImageType) => ({
        ...item,
        key: item.dataURL,
        onUpdate: (): void => onImageUpdate(item.dataURL),
        onRemove: (): void => onImageRemove(item.dataURL),
      }));
    }
    return initImageList;
  });

  const [keyUpdate, setKeyUpdate] = useState<string>("");
  const [errors, setErrors] = useState<ErrorsType>({ ...defaultErrors });

  const onStandardizeDataChange = (list: ImageListType): void => {
    if (onChange) {
      const sData: ImageListType = list.map(
        ({ key, onUpdate, onRemove, ...restOfItem }) => ({
          ...restOfItem,
        })
      );
      onChange(sData);
    }
  };

  const onImageUpload = (): void => {
    inputRef.current && inputRef.current.click();
  };

  const onImageRemoveAll = (): void => {
    setImageList([]);
    onStandardizeDataChange([]);
  };

  const onImageRemove = (key: string): void => {
    setImageList((previousList) => {
      const updatedList = previousList.filter(
        (item: ImageType) => item.key !== key
      );
      onStandardizeDataChange(updatedList);
      return updatedList;
    });
  };

  useEffect(() => {
    if (keyUpdate) {
      onImageUpload();
    }
  }, [keyUpdate]);

  const onImageUpdate = (key: string): void => {
    setKeyUpdate(key);
  };

  const getListFile = (files: FileList): Promise<ImageListType> => {
    const promiseFiles: Array<Promise<string>> = [];

    for (let i = 0; i < files.length; i++) {
      promiseFiles.push(getBase64(files[i]));
    }

    return Promise.all(promiseFiles).then((fileListBase64: Array<string>) => {
      const fileList: ImageListType = fileListBase64.map((base64, index) => {
        const key = `${new Date().getTime().toString()}-${files[index].name}`;
        return {
          dataURL: base64,
          file: files[index],
          key,
          onUpdate: (): void => onImageUpdate(key),
          onRemove: (): void => onImageRemove(key),
        };
      });
      return fileList;
    });
  };

  const validate = (fileList: ImageListType): boolean => {
    setErrors({ ...defaultErrors });
    if (maxNumber && fileList.length + imageList.length > maxNumber) {
      setErrors({ ...errors, maxNumber: true });
      return false;
    }
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i].file;
      if (file) {
        const fileType: string = file.type;
        if (!fileType.includes("image")) {
          setErrors({ ...errors, acceptType: true });
          return false;
        }
        if (maxFileSize) {
          const size = Math.round(file.size / 1024 / 1024);
          if (size > maxFileSize) {
            setErrors({ ...errors, maxFileSize: true });
            return false;
          }
        }
        if (acceptType && acceptType.length > 0) {
          const type: string = file.name.split(".").pop() || "";
          if (acceptType.indexOf(type) < 0) {
            setErrors({ ...errors, acceptType: true });
            return false;
          }
        }
      }
    }
    return true;
  };

  const onInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const { files } = e.target;

    if (files) {
      const fileList = await getListFile(files);
      if (fileList.length > 0) {
        if (validate(fileList)) {
          let updatedFileList: ImageListType;
          if (keyUpdate) {
            updatedFileList = imageList.map((item: ImageType) => {
              if (item.key === keyUpdate) return { ...fileList[0] };
              return item;
            });
            setKeyUpdate("");
          } else {
            if (multiple) {
              updatedFileList = [...imageList, ...fileList];
              if (maxNumber && updatedFileList.length > maxNumber) {
                updatedFileList = imageList;
              }
            } else {
              updatedFileList = [fileList[0]];
            }
          }
          setImageList(updatedFileList);
          onStandardizeDataChange(updatedFileList);
        } else {
        }
      } else {
        keyUpdate && setKeyUpdate("");
      }
    }
  };

  const acceptString =
    acceptType && acceptType.length > 0
      ? acceptType.map((item) => `.${item}`).join(", ")
      : "image/*";

  return (
    <>
      <input
        type="file"
        accept={acceptString}
        ref={inputRef}
        multiple={multiple && !keyUpdate}
        onChange={onInputChange}
        style={{ display: "none" }}
      />
      {children &&
        children({
          imageList,
          onImageUpload,
          onImageRemoveAll,
          errors,
        })}
    </>
  );
};

ImageUploading.defaultProps = {
  maxNumber: 1000,
  multiple: false,
  acceptType: [],
};

export default ImageUploading;
