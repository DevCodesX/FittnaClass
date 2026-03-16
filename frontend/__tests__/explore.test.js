import { render, screen, fireEvent } from '@testing-library/react';
import CourseSearch from '@/components/student/explore/CourseSearch';
import CourseFilters from '@/components/student/explore/CourseFilters';
import EmptyState from '@/components/student/explore/EmptyState';

describe('Explore Page Components', () => {
  describe('CourseSearch', () => {
    it('renders search input and button', () => {
      const mockOnQueryChange = jest.fn();
      const mockOnSubmit = jest.fn();
      
      // Need a simple wrapper since component might expect to be inside a form context, though it renders its own <form>
      render(
        <CourseSearch 
          query="" 
          onQueryChange={mockOnQueryChange} 
          onSubmit={mockOnSubmit} 
          isSearching={false} 
        />
      );

      const input = screen.getByPlaceholderText(/ابحث عن مادة/i);
      expect(input).toBeInTheDocument();
      
      const button = screen.getByRole('button', { name: /بحث/i });
      expect(button).toBeInTheDocument();
      
      // Test typing
      fireEvent.change(input, { target: { value: 'react' } });
      expect(mockOnQueryChange).toHaveBeenCalledWith('react');
    });
  });

  describe('CourseFilters', () => {
    const filters = [
      { id: 'all', label: 'الكل' },
      { id: 'general', label: 'عام' }
    ];

    it('renders all filter buttons and allows selection', () => {
      const mockOnChange = jest.fn();
      
      render(
        <CourseFilters 
          filters={filters}
          activeFilter="general"
          onChange={mockOnChange}
        />
      );

      const allButton = screen.getByRole('button', { name: 'الكل' });
      const generalButton = screen.getByRole('button', { name: 'عام' });
      
      expect(allButton).toBeInTheDocument();
      expect(generalButton).toBeInTheDocument();
      
      fireEvent.click(allButton);
      expect(mockOnChange).toHaveBeenCalledWith('all');
    });
  });

  describe('EmptyState', () => {
    it('shows query reset button when hasQuery is true', () => {
      const mockClear = jest.fn();
      render(<EmptyState hasQuery={true} onClearQuery={mockClear} />);
      
      const clearButton = screen.getByRole('button', { name: /مسح/i });
      expect(clearButton).toBeInTheDocument();
      
      fireEvent.click(clearButton);
      expect(mockClear).toHaveBeenCalled();
    });

    it('does not show reset button when hasQuery is false', () => {
      render(<EmptyState hasQuery={false} onClearQuery={() => {}} />);
      const clearButton = screen.queryByRole('button', { name: /مسح/i });
      expect(clearButton).not.toBeInTheDocument();
    });
  });
});
