import { useState } from 'react';
import { Image, Skeleton } from '@mantine/core';
import { motion } from 'framer-motion';
import { IconPhoto } from '@tabler/icons-react';

export function LazyImage({ src, alt, width, height, radius = 'sm', ...props }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--mantine-color-gray-1)',
          borderRadius: radius === 'sm' ? '4px' : radius === 'md' ? '8px' : radius,
        }}
        role="img"
        aria-label={`${alt} (failed to load)`}
      >
        <IconPhoto size={48} color="var(--mantine-color-gray-5)" aria-hidden="true" />
      </div>
    );
  }

  return (
    <>
      {!loaded && <Skeleton width={width} height={height} radius={radius} />}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: loaded ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: loaded ? 'block' : 'none' }}
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          radius={radius}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          {...props}
        />
      </motion.div>
    </>
  );
}
