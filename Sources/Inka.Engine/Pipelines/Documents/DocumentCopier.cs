// MIT License
//
// Copyright (c) 2022 Serhii Kokhan
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

using Carcass.Cli.Logging.Spectre.Loggers.Abstracts;
using Carcass.Core;
using Carcass.LocalStorage.Providers.Abstracts;
using Inka.Engine.Pipelines.Pipes;
using Inka.Engine.VirtualObjects;

namespace Inka.Engine.Pipelines.Documents;

public static class DocumentCopier
{
    public static List<Document> CopyDocumentsFrom(
        ISpectreCliLogger spectreCliLogger,
        ILocalStorageProvider localStorageProvider,
        VirtualObjectTree virtualObjectTree,
        PipelineContext pipelineContext,
        PipeConfiguration pipeConfiguration
    )
    {
        ArgumentVerifier.NotNull(spectreCliLogger, nameof(spectreCliLogger));
        ArgumentVerifier.NotNull(localStorageProvider, nameof(localStorageProvider));
        ArgumentVerifier.NotNull(virtualObjectTree, nameof(virtualObjectTree));
        ArgumentVerifier.NotNull(pipelineContext, nameof(pipelineContext));
        ArgumentVerifier.NotNull(pipeConfiguration, nameof(pipeConfiguration));

        List<Document> documents = new();

        List<string> copyFromContext = pipeConfiguration.Get<List<string>>(
            Predefined.PipeConfiguration.CopyFromContext
        );
        if (copyFromContext.Any())
            documents = pipelineContext.Documents
                .Where(d => copyFromContext.Contains(d.Extension!))
                .ToList();

        List<string> copyFromDisk = pipeConfiguration.Get<List<string>>(
            Predefined.PipeConfiguration.CopyFromDisk
        );
        if (copyFromDisk.Any())
            documents.AddRange(virtualObjectTree
                .Flatten()
                .Where(vo => !vo.IsDirectory)
                .Cast<VirtualFile>()
                .Where(vf => !documents.Select(d => d.VirtualObjectId).Contains(vf.Id))
                .Where(vf => copyFromDisk.Contains(vf.Extension))
                .Select(async vf =>
                    {
                        Document document = new(vf.Id, DocumentRouter.GetRoute(vf));
                        if (!pipeConfiguration.Get<bool>(Predefined.PipeConfiguration.PreventReadContent))
                            document.Content = await localStorageProvider.ReadFileAsTextAsync(
                                Path.Combine(pipelineContext.InputDirectory, vf.FullPath)
                            );

                        return document;
                    }
                )
                .Select(t => t.Result)
                .ToList()
            );

        return documents;
    }

    public static async Task CopyDocumentsToAsync(
        ISpectreCliLogger spectreCliLogger,
        ILocalStorageProvider localStorageProvider,
        VirtualObjectTree virtualObjectTree,
        IList<Document> documents,
        PipelineContext pipelineContext,
        PipeConfiguration pipeConfiguration,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();

        ArgumentVerifier.NotNull(spectreCliLogger, nameof(spectreCliLogger));
        ArgumentVerifier.NotNull(localStorageProvider, nameof(localStorageProvider));
        ArgumentVerifier.NotNull(virtualObjectTree, nameof(virtualObjectTree));
        ArgumentVerifier.NotNull(documents, nameof(documents));
        ArgumentVerifier.NotNull(pipelineContext, nameof(pipelineContext));
        ArgumentVerifier.NotNull(pipeConfiguration, nameof(pipeConfiguration));

        foreach (Document document in documents)
        {
            VirtualFile virtualFile = virtualObjectTree.GetSingle<VirtualFile>(document.VirtualObjectId);
            if (!pipeConfiguration.Get<bool>(Predefined.PipeConfiguration.CopyToDisk))
            {
                spectreCliLogger.LogInformation("Update document {0} in pipeline context starting...",
                    virtualFile.FullPath
                );
                pipelineContext.Documents.RemoveAll(d => d.VirtualObjectId.Equals(document.VirtualObjectId));
                pipelineContext.Documents.Add(document);
                spectreCliLogger.LogInformation("Update document {0} in pipeline context finished.",
                    virtualFile.FullPath
                );
                continue;
            }

            string sourceFilePath = Path.Join(pipelineContext.InputDirectory, virtualFile.RelativePath);
            string destinationFilePath = Path.Join(pipelineContext.OutputDirectory, document.Route);

            spectreCliLogger.LogInformation("Copy document from {0} to {1} starting...",
                sourceFilePath,
                destinationFilePath
            );
            await localStorageProvider.CopyFileAsync(
                sourceFilePath,
                destinationFilePath,
                cancellationToken
            );
            spectreCliLogger.LogInformation("Copy document from {0} to {1} finished.",
                sourceFilePath,
                destinationFilePath
            );
        }
    }

    public static async Task CopyDocumentContentToAsync(
        Document document,
        VirtualFile virtualFile,
        string outputDirectory,
        ISpectreCliLogger spectreCliLogger,
        ILocalStorageProvider localStorageProvider,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();

        ArgumentVerifier.NotNull(document, nameof(document));
        ArgumentVerifier.NotNull(virtualFile, nameof(virtualFile));
        ArgumentVerifier.NotNull(outputDirectory, nameof(outputDirectory));
        ArgumentVerifier.NotNull(spectreCliLogger, nameof(spectreCliLogger));
        ArgumentVerifier.NotNull(localStorageProvider, nameof(localStorageProvider));

        string destinationFilePath = Path.Join(outputDirectory, document.Route);

        spectreCliLogger.LogInformation("Copy document content to {0} starting...",
            destinationFilePath
        );
        await localStorageProvider.CreateFileAsync(document.Content, destinationFilePath, cancellationToken);
        spectreCliLogger.LogInformation("Copy document content to {0} finished.",
            destinationFilePath
        );
    }
}