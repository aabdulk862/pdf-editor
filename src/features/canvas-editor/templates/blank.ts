import type { CanvasTemplate } from '../types';

export const blankTemplate: CanvasTemplate = {
  id: 'template-blank',
  name: 'Blank Page',
  category: 'blank',
  thumbnail:
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjE2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTIwIiBoZWlnaHQ9IjE2MCIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjZTVlN2ViIiBzdHJva2Utd2lkdGg9IjEiLz48dGV4dCB4PSI2MCIgeT0iODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5Y2EzYWYiIGZvbnQtc2l6ZT0iMTIiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIj5CbGFuazwvdGV4dD48L3N2Zz4=',
  pages: [
    {
      id: 'blank-page-1',
      width: 210,
      height: 297,
      backgroundColor: '#FFFFFF',
      elements: [],
    },
  ],
};
