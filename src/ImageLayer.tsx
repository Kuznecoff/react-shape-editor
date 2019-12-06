import React, { useState, FunctionComponent, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

interface ImageDimensions {
  readonly naturalHeight: number;
  readonly naturalWidth: number;
}

type ImageLoadCallback = (dimensions: ImageDimensions) => void;

const useImageLoader = (
  imageSrc: string,
  onLoad: ImageLoadCallback
): ImageDimensions => {
  const [{ naturalHeight, naturalWidth }, setDimensions] = useState({
    naturalHeight: 0,
    naturalWidth: 0,
  });

  // Use a ref so it only re-runs the image load effect when the source changes
  const onLoadRef = useRef(onLoad);

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
      onLoadRef.current({
        naturalWidth: memoryImage.naturalWidth,
        naturalHeight: memoryImage.naturalHeight,
      });
    };
    memoryImage.src = imageSrc;

    return () => {
      didCancel = true;
    };
  }, [imageSrc, onLoadRef]);

  return { naturalHeight, naturalWidth };
};

interface Props {
  onLoad?: ImageLoadCallback;
  src: string;
}
const propTypes = {
  onLoad: PropTypes.func,
  src: PropTypes.string.isRequired,
};

const ImageLayer: FunctionComponent<Props> = ({
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
