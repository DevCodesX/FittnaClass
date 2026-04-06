describe('Free lesson upload flow', () => {
  it('teacher uploads free lesson and sees FREE badge in free filter', () => {
    cy.visit('/?auth=login');
    cy.get('input[name="email"]').type('teacher@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.contains('button', 'دخول إلى حسابك').click();

    cy.url().should('include', '/Teacher/dashboard');
    cy.visit('/Teacher/upload-center');
    cy.get('button[aria-pressed]').first().click({ force: true });
    cy.get('input[name="title"]').type('Free Physics Lesson');
    cy.get('select[name="category"]').select(1);
    cy.get('select[name="subject"]').select(1);
    cy.contains('button', 'حفظ ومتابعة ←').click();

    cy.visit('/student/explore');
    cy.contains('button', 'الدروس المجانية').click();
    cy.contains('FREE').should('be.visible');
  });
});
