import { extendTheme } from '@chakra-ui/react';

export const theme = extendTheme({
  styles: {
    global: {
      body: {
        bg: 'gray.50',
      },
    },
  },
  components: {
    Stack: {
      defaultProps: {
        spacing: 4,
      },
    },
    Button: {
      baseStyle: {
        _hover: {
          transform: 'scale(1.02)',
        },
      },
      variants: {
        solid: {
          bg: 'blue.500',
          color: 'white',
          _hover: {
            bg: 'blue.600',
          },
        },
        outline: {
          borderColor: 'gray.200',
          _hover: {
            bg: 'gray.50',
          },
        },
      },
      defaultProps: {
        colorScheme: 'blue',
      },
    },
    Table: {
      variants: {
        simple: {
          th: {
            borderBottom: '1px',
            borderColor: 'gray.200',
            fontWeight: 'semibold',
          },
          td: {
            borderBottom: '1px',
            borderColor: 'gray.200',
          },
        },
      },
      defaultProps: {
        variant: 'simple',
      },
    },
  },
}); 