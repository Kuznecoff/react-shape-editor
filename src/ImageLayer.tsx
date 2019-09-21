import React, { useState, FunctionComponent, useEffect } from 'react';
import PropTypes, { string } from 'prop-types';

interface ImageDimensions {
  readonly naturalHeight: number;
  readonly naturalWidth: number;
}

interface ImageLoadCallback {
  (dimensions: ImageDimensions): void;
}

interface ImageLayerProps {
  onLoad?: ImageLoadCallback;
  src: string;
}
const propTypes = {
  onLoad: PropTypes.func,
  src: PropTypes.string.isRequired,
};

const useImageLoader = (
  imageSrc: string,
  onLoad: ImageLoadCallback
): ImageDimensions => {
  const [{ naturalHeight, naturalWidth }, setDimensions] = useState({
    naturalHeight: 0,
    naturalWidth: 0,
  });

  useEffect(() => {
    let didCancel = false;
    // Load the background image in memory to measure its dimensions
    const memoryImage = new Image();

    memoryImage.onload = () => {
      if (didCancel) {
        return;
      }

      setDimensions({
        naturalWidth: memoryImage.naturalWidth,
        naturalHeight: memoryImage.naturalHeight,
      });
      onLoad({
        naturalWidth: memoryImage.naturalWidth,
        naturalHeight: memoryImage.naturalHeight,
      });
    };
    memoryImage.src = imageSrc;

    return () => {
      didCancel = true;
    };
  }, [imageSrc, onLoad]);

  return { naturalHeight, naturalWidth };
};

const ImageLayer: FunctionComponent<ImageLayerProps> = ({
  onLoad = () => {},
  src,
  ...otherProps
}) => {
  const { naturalHeight, naturalWidth } = useImageLoader(src, onLoad);

  return (
    <image
      href={src}
      width={naturalWidth}
      height={naturalHeight}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...otherProps}
    />
  );
};

ImageLayer.propTypes = propTypes;

export default ImageLayer;
