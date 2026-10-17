import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LoginPage } from './login.page';

describe('Página pública do NeoGuide', () => {
  let fixture: ComponentFixture<LoginPage>;
  let root: HTMLElement;
  const click = (selector: string) => {
    const element = root.querySelector<HTMLElement>(selector)!;
    element.click();
    fixture.detectChanges();
    return element;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LoginPage], providers: [provideRouter([])] }).compileComponents();
    fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    root = fixture.nativeElement;
  });

  afterEach(() => fixture.destroy());

  it('alterna os submenus e fecha com Escape devolvendo o foco', () => {
    click('#navToggle');
    const first = click('[aria-controls="submenu-0"]');
    expect(first.getAttribute('aria-expanded')).toBe('true');
    const second = click('[aria-controls="submenu-1"]');
    expect(first.getAttribute('aria-expanded')).toBe('false');
    expect(second.getAttribute('aria-expanded')).toBe('true');
    second.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(second.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(second);
  });

  it('abre o menu móvel e fecha ao clicar fora', () => {
    const toggle = click('#navToggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelector('#navMenu')!.classList.contains('open')).toBeTrue();
    document.body.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('abre o login existente sem navegar para um fragmento vazio', () => {
    click('.login-card .btn-dark');
    expect(root.querySelector<HTMLDialogElement>('app-login-dialog dialog')!.open).toBeTrue();
    click('app-login-dialog button[aria-label="Fechar"]');
    expect(root.querySelector<HTMLDialogElement>('app-login-dialog dialog')!.open).toBeFalse();
  });

  it('oferece acesso Neoenergia no topo e na faixa corporativa', () => {
    expect(root.querySelector('.neo-access')!.getAttribute('href')).toBe('/login/neoenergia');
    expect(root.querySelector('.btn-analyst')!.getAttribute('href')).toBe('/login/neoenergia');
    expect(root.querySelectorAll('.hl-card').length).toBe(3);
    expect(root.querySelectorAll('.help-card').length).toBe(4);
  });

  it('abre informações úteis e informa quando o PDF não está disponível', () => {
    click('[aria-controls="submenu-1"]');
    click('a[href="#norma-download"]');
    const dialog = root.querySelector<HTMLDialogElement>('.info-dialog')!;
    expect(dialog.open).toBeTrue();
    expect(dialog.textContent).toContain('O arquivo da norma ainda não foi disponibilizado');
    click('.info-close');
    expect(dialog.open).toBeFalse();
    click('.hl-card.featured');
    expect(dialog.open).toBeTrue();
    expect(dialog.querySelector('h2')!.textContent).toBe('Primeiro acesso');
  });

  it('envia mensagens como texto, ignora mensagens vazias e restaura o foco ao fechar', async () => {
    const fab = click('#chatFab');
    await fixture.whenStable();
    expect(document.activeElement).toBe(root.querySelector('#chatInput'));
    const input = root.querySelector<HTMLInputElement>('#chatInput')!;
    const form = root.querySelector<HTMLFormElement>('#chatForm')!;
    input.value = '   ';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(root.querySelectorAll('.msg').length).toBe(1);
    input.value = '<img src=x onerror=alert(1)>';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(root.querySelector('.msg.me')!.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(root.querySelector('.chat-body img')).toBeNull();
    expect(root.querySelectorAll('.msg').length).toBe(3);
    expect(input.value).toBe('');
    click('#chatClose');
    expect(fab.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(fab);
  });
});
