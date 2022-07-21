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

using Carcass.Cli.Logging.Spectre.Loggers;
using Carcass.Cli.Logging.Spectre.Loggers.Abstracts;
using Carcass.Core;
using Carcass.LocalStorage.Providers.Abstracts;
using Inka.Engine.Pipelines;
using Inka.Engine.Pipelines.Documents;
using Inka.Engine.Pipelines.Pipes;
using Inka.Engine.Pipelines.Pipes.Abstracts;
using Inka.Engine.VirtualObjects;

namespace Inka.Modules.Operations.Sitemap;

public interface ISitemapPipe : IPipe
{
}

public sealed class SitemapPipe : OperationPipe, ISitemapPipe
{
    private readonly ILocalStorageProvider _localStorageProvider;
    private readonly SitemapOptions _options;

    public SitemapPipe(
        ISpectreCliLogger spectreCliLogger,
        PipeConfiguration configuration,
        string name,
        ILocalStorageProvider localStorageProvider,
        SitemapOptions options
    ) : base(spectreCliLogger, configuration)
    {
        ArgumentVerifier.NotNull(name, nameof(name));
        ArgumentVerifier.NotNull(localStorageProvider, nameof(localStorageProvider));
        ArgumentVerifier.NotNull(options, nameof(options));

        Name = name;
        _localStorageProvider = localStorageProvider;
        _options = options;
    }

    public override string Name { get; }

    public override async Task ExecuteAsync(
        SpectreCliLoggerStatusContext spectreCliLoggerStatusContext,
        VirtualObjectTree virtualObjectTree,
        PipelineContext pipelineContext,
        CancellationToken cancellationToken = default
    )
    {
        await base.ExecuteAsync(spectreCliLoggerStatusContext, virtualObjectTree, pipelineContext, cancellationToken);

        spectreCliLoggerStatusContext.SetStatus($"{Name} pipe executing...");

        Sitemap sitemap = new();

        foreach (Document document in pipelineContext.Documents)
        {
            VirtualFile virtualFile = virtualObjectTree.GetSingle<VirtualFile>(document.VirtualObjectId);
            if (virtualFile.Name.StartsWith("_", StringComparison.InvariantCultureIgnoreCase))
            {
                SpectreCliLogger.LogWarning("Execute sitemap on document {0} skipped.",
                    virtualFile.FullPath
                );
                continue;
            }

            SpectreCliLogger.LogInformation("Execute sitemap on document {0} starting...",
                virtualFile.FullPath
            );

            SitemapLocation sitemapLocation = new()
            {
                ChangeFrequency = SitemapChangeFrequency.Always,
                Url = new Uri(_options.Uri, document.Route).AbsoluteUri
            };
            sitemap.Add(sitemapLocation);
            SpectreCliLogger.LogInformation("Add {0} to sitemap.",
                sitemapLocation
            );

            SpectreCliLogger.LogInformation("Execute sitemap on document {0} finished.",
                virtualFile.FullPath
            );
        }

        await _localStorageProvider.CreateFileAsync(
            sitemap.ToString(),
            Path.Join(pipelineContext.OutputDirectory, "sitemap.xml"),
            cancellationToken
        );
    }
}