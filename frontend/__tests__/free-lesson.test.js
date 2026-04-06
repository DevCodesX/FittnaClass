import { render, screen } from '@testing-library/react';
import CourseCard from '@/components/student/explore/CourseCard';
import { buildCoursePayload, isFreeLessonCourse } from '@/lib/freeLesson';
import { courseSchema } from '@/lib/validators';

jest.mock('next/link', () => {
  return function MockLink({ href, children, ...rest }) {
    return <a href={href} {...rest}>{children}</a>;
  };
});

describe('Free lesson feature', () => {
  it('keeps free toggle payload with zero price', () => {
    const payload = buildCoursePayload({
      title: 'Free Biology',
      price: '250',
      is_free_lesson: true,
    });

    expect(payload.is_free_lesson).toBe(true);
    expect(payload.price).toBe(0);
  });

  it('validates price with free toggle rules', () => {
    const validFree = courseSchema.safeParse({
      title: 'Free Math',
      subject: 'Math',
      category: 'general',
      is_free_lesson: true,
      price: 0,
    });
    expect(validFree.success).toBe(true);

    const invalidPaid = courseSchema.safeParse({
      title: 'Paid Math',
      subject: 'Math',
      category: 'general',
      is_free_lesson: false,
      price: 0,
    });
    expect(invalidPaid.success).toBe(false);
  });

  it('renders FREE badge in lesson list card', () => {
    render(
      <CourseCard
        course={{
          id: 11,
          title: 'Free lesson',
          subject: 'Physics',
          price: 0,
          course_code: 'FT-11',
          teacher: { name: 'Teacher One' },
        }}
      />
    );

    expect(screen.getByText('FREE')).toBeInTheDocument();
  });

  it('detects free lesson status from price and flag', () => {
    expect(isFreeLessonCourse({ price: 0 })).toBe(true);
    expect(isFreeLessonCourse({ is_free_lesson: true, price: 150 })).toBe(true);
    expect(isFreeLessonCourse({ price: 150 })).toBe(false);
  });
});
