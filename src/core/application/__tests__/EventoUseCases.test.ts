import { Coordenada } from '../../domain/value-objects/Coordenada';
import { InMemoryEventoRepository } from '../../../infrastructure/database/memory/InMemoryEventoRepository';
import { FakeLocationGateway } from '../../../infrastructure/device/FakeLocationGateway';
import { FakeSyncGateway } from '../../../infrastructure/device/FakeSyncGateway';
import { CadastrarEventoUseCase } from '../usecases/CadastrarEventoUseCase';
import { EditarEventoUseCase } from '../usecases/EditarEventoUseCase';
import { ListarEventosUseCase } from '../usecases/ListarEventosUseCase';
import { RemoverEventoUseCase } from '../usecases/RemoverEventoUseCase';

const USUARIO_ID = 'a1111111-1111-4111-8111-111111111111';
const OUTRO_USUARIO_ID = 'b2222222-2222-4222-8222-222222222222';

describe('Evento use cases', () => {
  it('cadastrar com pin manual + enfileira', async () => {
    const repo = new InMemoryEventoRepository();
    const sync = new FakeSyncGateway();
    const gps = new FakeLocationGateway();
    const useCase = new CadastrarEventoUseCase(repo, sync, gps);

    const evento = await useCase.execute({
      usuarioId: USUARIO_ID,
      nome: 'Feira',
      data: new Date('2026-10-12'),
      endereco: 'Praca',
      localizacao: new Coordenada(0, 0),
    });

    expect(evento.nome).toBe('Feira');
    expect(sync.queue[0]).toMatchObject({ entidade: 'Evento', tipo: 'CRIAR' });
  });

  it('cadastrar com GPS resolve coordenada via gateway', async () => {
    const repo = new InMemoryEventoRepository();
    const sync = new FakeSyncGateway();
    const gps = new FakeLocationGateway(new Coordenada(1, 1));
    const useCase = new CadastrarEventoUseCase(repo, sync, gps);

    const evento = await useCase.execute({
      usuarioId: USUARIO_ID,
      nome: 'Feira GPS',
      data: new Date('2026-10-12'),
      endereco: 'x',
      usarGps: true,
    });

    expect(evento.localizacao.latitude).toBe(1);
  });

  it('cadastrar com GPS negado orienta posicionamento manual', async () => {
    const repo = new InMemoryEventoRepository();
    const sync = new FakeSyncGateway();
    const gps = new FakeLocationGateway(new Coordenada(0, 0), true);
    const useCase = new CadastrarEventoUseCase(repo, sync, gps);

    await expect(
      useCase.execute({
        usuarioId: USUARIO_ID,
        nome: 'Feira GPS',
        data: new Date('2026-10-12'),
        endereco: 'x',
        usarGps: true,
      }),
    ).rejects.toThrow(/pin manual/i);
  });

  it('editar atualiza evento e enfileira EDITAR', async () => {
    const repo = new InMemoryEventoRepository();
    const sync = new FakeSyncGateway();
    const gps = new FakeLocationGateway();
    const cadastrar = new CadastrarEventoUseCase(repo, sync, gps);
    const evento = await cadastrar.execute({
      usuarioId: USUARIO_ID,
      nome: 'Feira',
      data: new Date('2026-10-12'),
      endereco: 'Praca',
      localizacao: new Coordenada(0, 0),
    });
    const editar = new EditarEventoUseCase(repo, sync);

    const editado = await editar.execute({
      eventoId: evento.id,
      nome: 'Feira Nova',
      data: new Date('2026-10-13'),
      endereco: 'Outro endereco',
      localizacao: new Coordenada(1, 2),
      observacoes: 'Levar estoque',
    });

    expect(editado.nome).toBe('Feira Nova');
    expect(sync.queue).toContainEqual(
      expect.objectContaining({ tipo: 'EDITAR', entidade: 'Evento', entidadeId: evento.id }),
    );
  });

  it('listar retorna somente eventos do usuario', async () => {
    const repo = new InMemoryEventoRepository();
    const sync = new FakeSyncGateway();
    const gps = new FakeLocationGateway();
    const cadastrar = new CadastrarEventoUseCase(repo, sync, gps);
    const esperado = await cadastrar.execute({
      usuarioId: USUARIO_ID,
      nome: 'Feira',
      data: new Date('2026-10-12'),
      endereco: 'Praca',
      localizacao: new Coordenada(0, 0),
    });
    await cadastrar.execute({
      usuarioId: OUTRO_USUARIO_ID,
      nome: 'Outra',
      data: new Date('2026-10-13'),
      endereco: 'Outro',
      localizacao: new Coordenada(1, 1),
    });
    const listar = new ListarEventosUseCase(repo);

    expect(await listar.execute({ usuarioId: USUARIO_ID })).toEqual([esperado]);
  });

  it('remover sem confirmado aborta (Review Focus)', async () => {
    const repo = new InMemoryEventoRepository();
    const sync = new FakeSyncGateway();
    const gps = new FakeLocationGateway();
    const cadastrar = new CadastrarEventoUseCase(repo, sync, gps);
    const evento = await cadastrar.execute({
      usuarioId: USUARIO_ID,
      nome: 'F',
      data: new Date('2026-10-12'),
      endereco: 'x',
      localizacao: new Coordenada(0, 0),
    });
    const remover = new RemoverEventoUseCase(repo, sync);

    await expect(remover.execute({ eventoId: evento.id, confirmado: false })).rejects.toThrow(
      /confirma/i,
    );
    expect(await repo.findById(evento.id)).not.toBeNull();
  });

  it('remover confirmado soft-deleta e enfileira DELETAR', async () => {
    const repo = new InMemoryEventoRepository();
    const sync = new FakeSyncGateway();
    const gps = new FakeLocationGateway();
    const cadastrar = new CadastrarEventoUseCase(repo, sync, gps);
    const evento = await cadastrar.execute({
      usuarioId: USUARIO_ID,
      nome: 'F',
      data: new Date('2026-10-12'),
      endereco: 'x',
      localizacao: new Coordenada(0, 0),
    });
    const remover = new RemoverEventoUseCase(repo, sync);

    await remover.execute({ eventoId: evento.id, confirmado: true });

    expect(await repo.findById(evento.id)).toBeNull();
    expect(sync.queue).toContainEqual(
      expect.objectContaining({ tipo: 'DELETAR', entidade: 'Evento', entidadeId: evento.id }),
    );
  });
});
