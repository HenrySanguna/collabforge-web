import { buildExportFilename, downloadMarkdown, sanitizeSlug } from './download.util';

describe('sanitizeSlug', () => {
  it('deja pasar un slug ya válido', () => {
    expect(sanitizeSlug('retro-abc')).toBe('retro-abc');
  });

  it('reemplaza espacios y caracteres inválidos por guiones', () => {
    expect(sanitizeSlug('Retro de Equipo!! 2026')).toBe('retro-de-equipo-2026');
  });

  it('colapsa guiones repetidos y recorta los de los extremos', () => {
    expect(sanitizeSlug('--retro--abc--')).toBe('retro-abc');
  });

  it('usa "board" como fallback si el slug queda vacío', () => {
    expect(sanitizeSlug('¡¡¡!!!')).toBe('board');
  });
});

describe('buildExportFilename', () => {
  it('arma "{slug}-{fecha}.md" con la fecha en formato ISO corto', () => {
    const filename = buildExportFilename('retro-abc', new Date('2026-03-05T12:00:00Z'));
    expect(filename).toBe('retro-abc-2026-03-05.md');
  });

  it('sanitiza el slug antes de armar el nombre', () => {
    const filename = buildExportFilename('Retro Equipo!', new Date('2026-03-05T12:00:00Z'));
    expect(filename).toBe('retro-equipo-2026-03-05.md');
  });
});

describe('downloadMarkdown', () => {
  it('crea un Blob, dispara la descarga vía <a download> y revoca la URL del objeto', () => {
    const createObjectURLSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:fake-url');
    const revokeObjectURLSpy = spyOn(URL, 'revokeObjectURL');
    const clickSpy = jasmine.createSpy('click');
    const anchor = { href: '', download: '', click: clickSpy } as unknown as HTMLAnchorElement;
    spyOn(document, 'createElement').and.returnValue(anchor);

    downloadMarkdown('retro-abc', '# Hola', new Date('2026-03-05T12:00:00Z'));

    expect(createObjectURLSpy).toHaveBeenCalled();
    const blobArg = createObjectURLSpy.calls.mostRecent().args[0] as Blob;
    expect(blobArg.type).toBe('text/markdown;charset=utf-8');
    expect(anchor.href).toBe('blob:fake-url');
    expect(anchor.download).toBe('retro-abc-2026-03-05.md');
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:fake-url');
  });
});
